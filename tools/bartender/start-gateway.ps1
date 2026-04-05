param(
  [string]$ConfigPath = "$PSScriptRoot\config.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:LastPayload = $null
$script:LastResult = $null
$script:GatewayStartedAt = Get-Date

function ConvertTo-SafeJson {
  param(
    [Parameter(Mandatory=$true)] [object]$InputObject,
    [int]$Depth = 10
  )
  try {
    return $InputObject | ConvertTo-Json -Depth $Depth
  } catch {
    $fallback = @{
      code = 500
      message = 'JSON serialize failed'
      detail = $_.Exception.Message
      time = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    }
    return $fallback | ConvertTo-Json -Depth 6
  }
}

function Get-InstalledPrintersSafe {
  $rows = New-Object System.Collections.Generic.List[object]

  # 优先使用 .NET API（Win7/Win10 通用，且对象简单，不会出现循环引用）
  try {
    $installed = [System.Drawing.Printing.PrinterSettings]::InstalledPrinters
    foreach ($name in $installed) {
      if ([string]::IsNullOrWhiteSpace([string]$name)) { continue }
      $rows.Add([PSCustomObject]@{
        Name = [string]$name
        DriverName = ''
        PortName = ''
        PrinterStatus = 0
      })
    }
  } catch {}

  # 补充驱动/端口信息（WMI 在 Win7 通常可用）
  try {
    $wmi = Get-WmiObject Win32_Printer -ErrorAction SilentlyContinue
    foreach ($p in @($wmi)) {
      $name = [string]$p.Name
      if ([string]::IsNullOrWhiteSpace($name)) { continue }
      $exists = $false
      foreach ($x in $rows) {
        if ([string]$x.Name -eq $name) { $exists = $true; break }
      }
      if ($exists) {
        foreach ($x in $rows) {
          if ([string]$x.Name -eq $name) {
            if ([string]::IsNullOrWhiteSpace([string]$x.DriverName)) { $x.DriverName = [string]$p.DriverName }
            if ([string]::IsNullOrWhiteSpace([string]$x.PortName)) { $x.PortName = [string]$p.PortName }
          }
        }
      } else {
        $rows.Add([PSCustomObject]@{
          Name = $name
          DriverName = [string]$p.DriverName
          PortName = [string]$p.PortName
          PrinterStatus = 0
        })
      }
    }
  } catch {}

  # Win10+ 再尝试 Get-Printer 覆盖状态
  try {
    $gp = Get-Printer -ErrorAction SilentlyContinue
    foreach ($p in @($gp)) {
      $name = [string]$p.Name
      if ([string]::IsNullOrWhiteSpace($name)) { continue }
      $found = $false
      foreach ($x in $rows) {
        if ([string]$x.Name -eq $name) {
          $found = $true
          if ([string]::IsNullOrWhiteSpace([string]$x.DriverName)) { $x.DriverName = [string]$p.DriverName }
          if ([string]::IsNullOrWhiteSpace([string]$x.PortName)) { $x.PortName = [string]$p.PortName }
          try { $x.PrinterStatus = [int]$p.PrinterStatus } catch {}
          break
        }
      }
      if (-not $found) {
        $status = 0
        try { $status = [int]$p.PrinterStatus } catch {}
        $rows.Add([PSCustomObject]@{
          Name = $name
          DriverName = [string]$p.DriverName
          PortName = [string]$p.PortName
          PrinterStatus = $status
        })
      }
    }
  } catch {}

  $rows | Sort-Object Name -Unique
}

function Get-DashboardData {
  param(
    [object]$CurrentConfig,
    [string]$CurrentConfigPath
  )

  $now = Get-Date
  $uptimeSeconds = 0
  try { $uptimeSeconds = [int](($now - $script:GatewayStartedAt).TotalSeconds) } catch {}

  $templateKeys = @()
  try {
    if ($CurrentConfig -and $CurrentConfig.templates) {
      $templateKeys = @($CurrentConfig.templates.PSObject.Properties | ForEach-Object { $_.Name })
    }
  } catch {}

  $printers = @(Get-InstalledPrintersSafe)
  return @{
    code = 200
    data = @{
      service = @{
        status = 'online'
        pid = $PID
        startedAt = $script:GatewayStartedAt.ToString('yyyy-MM-dd HH:mm:ss')
        now = $now.ToString('yyyy-MM-dd HH:mm:ss')
        uptimeSeconds = $uptimeSeconds
        listenPrefix = [string]$CurrentConfig.listenPrefix
        configPath = $CurrentConfigPath
      }
      templates = @{
        configuredCount = $templateKeys.Count
        configuredKeys = $templateKeys
      }
      printers = @{
        count = $printers.Count
        names = @($printers | ForEach-Object { [string]$_.Name })
      }
      lastPrint = @{
        payload = $script:LastPayload
        result = $script:LastResult
      }
    }
  }
}

function Write-JsonResponse {
  param(
    [Parameter(Mandatory=$true)] [System.Net.HttpListenerResponse]$Response,
    [Parameter(Mandatory=$true)] [int]$StatusCode,
    [Parameter(Mandatory=$true)] [object]$Body
  )
  $json = ConvertTo-SafeJson -InputObject $Body -Depth 10
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Response.Headers['Access-Control-Allow-Origin'] = '*'
  $Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Api-Key'
  $Response.StatusCode = $StatusCode
  $Response.ContentType = 'application/json; charset=utf-8'
  $Response.ContentEncoding = [System.Text.Encoding]::UTF8
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Write-EmptyResponse {
  param(
    [Parameter(Mandatory=$true)] [System.Net.HttpListenerResponse]$Response,
    [Parameter(Mandatory=$true)] [int]$StatusCode
  )
  $Response.Headers['Access-Control-Allow-Origin'] = '*'
  $Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Api-Key'
  $Response.StatusCode = $StatusCode
  $Response.OutputStream.Close()
}

function Read-JsonFileSafe {
  param([string]$Path)
  if (!(Test-Path $Path)) { return $null }
  try {
    return Get-Content -Path $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Save-JsonFileSafe {
  param(
    [string]$Path,
    [object]$Data
  )
  $json = $Data | ConvertTo-Json -Depth 20
  Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Read-ConfigObject {
  param([string]$Path)
  if (!(Test-Path $Path)) {
    throw "Config file not found: $Path"
  }
  return Get-Content -Path $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Save-ConfigObject {
  param(
    [string]$Path,
    [object]$ConfigObject
  )
  $json = $ConfigObject | ConvertTo-Json -Depth 20
  Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Escape-Xml {
  param([string]$Value)
  if ($null -eq $Value) { return '' }
  return [System.Security.SecurityElement]::Escape($Value)
}

function Build-NamedSubStringsXml {
  param([object]$Data)
  if ($null -eq $Data) { return '' }

  $pairs = @()
  if ($Data -is [System.Collections.IDictionary]) {
    foreach ($k in $Data.Keys) {
      $pairs += [PSCustomObject]@{ Name = [string]$k; Value = $Data[$k] }
    }
  } else {
    foreach ($p in $Data.PSObject.Properties) {
      $pairs += [PSCustomObject]@{ Name = [string]$p.Name; Value = $p.Value }
    }
  }

  $items = New-Object System.Collections.Generic.List[string]
  foreach ($pair in $pairs) {
    $name = [string]$pair.Name
    if ([string]::IsNullOrWhiteSpace($name)) { continue }

    $v = $pair.Value
    if ($null -eq $v) { continue }

    if ($v -is [string] -or $v -is [ValueType]) {
      $value = Escape-Xml ([string]$v)
      $n = Escape-Xml $name
      $items.Add("<NamedSubString Name=`"$n`"><Value>$value</Value></NamedSubString>")
    } elseif ($v -is [System.Collections.IEnumerable]) {
      $value = Escape-Xml (($v | ConvertTo-Json -Compress -Depth 8))
      $n = Escape-Xml ($name + 'Json')
      $items.Add("<NamedSubString Name=`"$n`"><Value>$value</Value></NamedSubString>")
    } else {
      $value = Escape-Xml ([string]$v)
      $n = Escape-Xml $name
      $items.Add("<NamedSubString Name=`"$n`"><Value>$value</Value></NamedSubString>")
    }
  }

  return ($items -join "`n")
}

function Invoke-BarTenderPrint {
  param(
    [string]$BarTenderExe,
    [string]$FormatPath,
    [string]$Printer,
    [int]$Copies,
    [object]$Data,
    [int]$TimeoutSeconds
  )

  if (!(Test-Path $BarTenderExe)) { throw "BarTender executable not found: $BarTenderExe" }
  if (!(Test-Path $FormatPath)) { throw "Template file not found: $FormatPath" }
  if ($Copies -lt 1) { $Copies = 1 }

  $namedSubs = Build-NamedSubStringsXml -Data $Data
  $formatEsc = Escape-Xml $FormatPath
  $printerEsc = Escape-Xml $Printer

  $xml = @"
<?xml version="1.0" encoding="utf-8"?>
<XMLScript Version="2.0">
  <Command Name="MESPrint">
    <Print>
      <Format>$formatEsc</Format>
      <PrintSetup>
        <Printer>$printerEsc</Printer>
        <IdenticalCopiesOfLabel>$Copies</IdenticalCopiesOfLabel>
      </PrintSetup>
      $namedSubs
    </Print>
  </Command>
</XMLScript>
"@

  $tempXml = Join-Path $env:TEMP ("mes_bt_" + [guid]::NewGuid().ToString('N') + ".xml")
  Set-Content -Path $tempXml -Value $xml -Encoding UTF8

  try {
    $args = "/XMLScriptFile=`"$tempXml`" /X"
    $proc = Start-Process -FilePath $BarTenderExe -ArgumentList $args -PassThru -WindowStyle Hidden
    $finished = $proc.WaitForExit($TimeoutSeconds * 1000)
    if (-not $finished) {
      try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
      throw "BarTender timed out. Template may still be bound to database fields or waiting for a dialog. Please convert template objects to Named Data Source."
    }
    if ($proc.ExitCode -ne 0) {
      throw "BarTender exit code: $($proc.ExitCode)"
    }
  } finally {
    Remove-Item -Path $tempXml -ErrorAction SilentlyContinue
  }
}

function Invoke-TemplateSync {
  param(
    [string]$CurrentScriptRoot,
    [object]$Payload
  )

  $syncScriptPath = Join-Path $CurrentScriptRoot 'sync-templates.ps1'
  if (!(Test-Path $syncScriptPath)) {
    throw 'sync-templates.ps1 not found'
  }

  $syncConfigPath = Join-Path $CurrentScriptRoot 'sync-config.json'
  $syncCfg = Read-JsonFileSafe -Path $syncConfigPath
  if ($null -eq $syncCfg) { $syncCfg = @{} }

  $manifestUrl = [string]$payload.manifestUrl
  if ([string]::IsNullOrWhiteSpace($manifestUrl)) { $manifestUrl = [string]$syncCfg.manifestUrl }

  $templateDir = [string]$payload.templateDir
  if ([string]::IsNullOrWhiteSpace($templateDir)) { $templateDir = [string]$syncCfg.templateDir }
  if ([string]::IsNullOrWhiteSpace($templateDir)) { $templateDir = Join-Path $CurrentScriptRoot 'templates' }

  $localManifestPath = [string]$payload.localManifestPath
  if ([string]::IsNullOrWhiteSpace($localManifestPath)) { $localManifestPath = [string]$syncCfg.localManifestPath }
  if ([string]::IsNullOrWhiteSpace($localManifestPath)) { $localManifestPath = Join-Path $CurrentScriptRoot 'template-manifest.local.json' }

  $configPath = [string]$payload.configPath
  if ([string]::IsNullOrWhiteSpace($configPath)) { $configPath = [string]$syncCfg.configPath }
  if ([string]::IsNullOrWhiteSpace($configPath)) { $configPath = Join-Path $CurrentScriptRoot 'config.json' }

  $defaultPrinter = [string]$payload.defaultPrinter
  if ([string]::IsNullOrWhiteSpace($defaultPrinter)) { $defaultPrinter = [string]$syncCfg.defaultPrinter }

  $apiKey = [string]$payload.apiKey
  if ([string]::IsNullOrWhiteSpace($apiKey)) { $apiKey = [string]$syncCfg.apiKey }

  $authToken = [string]$payload.authToken
  if ([string]::IsNullOrWhiteSpace($authToken)) { $authToken = [string]$syncCfg.authToken }

  if ([string]::IsNullOrWhiteSpace($manifestUrl)) {
    throw 'manifestUrl is required'
  }

  $newSyncCfg = [ordered]@{
    manifestUrl = $manifestUrl
    templateDir = $templateDir
    localManifestPath = $localManifestPath
    configPath = $configPath
    defaultPrinter = $defaultPrinter
    apiKey = $apiKey
    authToken = $authToken
  }
  Save-JsonFileSafe -Path $syncConfigPath -Data $newSyncCfg

  & $syncScriptPath -ManifestUrl $manifestUrl -TemplateDir $templateDir -LocalManifestPath $localManifestPath -ConfigPath $configPath -DefaultPrinter $defaultPrinter -ApiKey $apiKey -AuthToken $authToken

  return @{
    manifestUrl = $manifestUrl
    templateDir = $templateDir
    localManifestPath = $localManifestPath
    configPath = $configPath
    syncedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  }
}

$config = Read-ConfigObject -Path $ConfigPath
$prefix = [string]$config.listenPrefix
if ([string]::IsNullOrWhiteSpace($prefix)) {
  throw 'config.listenPrefix is required'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "BarTender gateway started: $prefix" -ForegroundColor Green
Write-Host "POST ${prefix}print" -ForegroundColor Cyan

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    try {
      if ($req.HttpMethod -eq 'OPTIONS') {
        Write-EmptyResponse -Response $res -StatusCode 204
        continue
      }

      if ($req.HttpMethod -eq 'GET' -and $req.Url.AbsolutePath -eq '/health') {
        Write-JsonResponse -Response $res -StatusCode 200 -Body @{ ok = $true; ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
        continue
      }

      if ($req.HttpMethod -eq 'GET' -and $req.Url.AbsolutePath -eq '/last') {
        Write-JsonResponse -Response $res -StatusCode 200 -Body @{
          payload = $script:LastPayload
          result = $script:LastResult
          ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        }
        continue
      }

      if ($req.HttpMethod -eq 'GET' -and $req.Url.AbsolutePath -eq '/config') {
        $config = Read-ConfigObject -Path $ConfigPath
        Write-JsonResponse -Response $res -StatusCode 200 -Body @{ code = 200; data = $config }
        continue
      }

      if ($req.HttpMethod -eq 'GET' -and $req.Url.AbsolutePath -eq '/dashboard') {
        $config = Read-ConfigObject -Path $ConfigPath
        $board = Get-DashboardData -CurrentConfig $config -CurrentConfigPath $ConfigPath
        Write-JsonResponse -Response $res -StatusCode 200 -Body $board
        continue
      }

      if ($req.HttpMethod -eq 'POST' -and $req.Url.AbsolutePath -eq '/config') {
        $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
        $bodyText = $reader.ReadToEnd()
        $reader.Close()
        if ([string]::IsNullOrWhiteSpace($bodyText)) {
          throw 'Request body is empty'
        }
        $newConfig = $bodyText | ConvertFrom-Json
        Save-ConfigObject -Path $ConfigPath -ConfigObject $newConfig
        $config = Read-ConfigObject -Path $ConfigPath
        Write-JsonResponse -Response $res -StatusCode 200 -Body @{ code = 200; message = 'Config saved'; data = $config }
        continue
      }

      if ($req.HttpMethod -eq 'POST' -and $req.Url.AbsolutePath -eq '/sync-templates') {
        $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
        $bodyText = $reader.ReadToEnd()
        $reader.Close()
        $payload = @{}
        if (-not [string]::IsNullOrWhiteSpace($bodyText)) {
          $payload = $bodyText | ConvertFrom-Json
        }
        $syncResult = Invoke-TemplateSync -CurrentScriptRoot $PSScriptRoot -Payload $payload
        $config = Read-ConfigObject -Path $ConfigPath
        Write-JsonResponse -Response $res -StatusCode 200 -Body @{ code = 200; message = 'Template sync done'; data = $syncResult; config = $config }
        continue
      }

      if ($req.HttpMethod -eq 'GET' -and $req.Url.AbsolutePath -eq '/printers') {
        $printers = @(Get-InstalledPrintersSafe)
        Write-JsonResponse -Response $res -StatusCode 200 -Body @{ code = 200; data = $printers }
        continue
      }

      if ($req.HttpMethod -ne 'POST' -or $req.Url.AbsolutePath -ne '/print') {
        Write-JsonResponse -Response $res -StatusCode 404 -Body @{ code = 404; message = 'Not Found' }
        continue
      }

      $reader = [System.IO.StreamReader]::new($req.InputStream, [System.Text.Encoding]::UTF8)
      $bodyText = $reader.ReadToEnd()
      $reader.Close()
      $script:LastPayload = $bodyText

      if ([string]::IsNullOrWhiteSpace($bodyText)) {
        throw 'Request body is empty'
      }

      $payload = $bodyText | ConvertFrom-Json
      $templateKey = [string]$payload.template
      if ([string]::IsNullOrWhiteSpace($templateKey)) {
        throw 'payload.template is required'
      }

      $tpl = $config.templates.PSObject.Properties[$templateKey].Value
      if ($null -eq $tpl) {
        throw "Template not configured: $templateKey"
      }

      $barTenderExe = [string]$config.barTenderExe
      $formatPath = [string]$tpl.formatPath
      $printer = [string]$tpl.printer
      $copies = 1
      if ($null -ne $payload.copies) {
        [int]::TryParse([string]$payload.copies, [ref]$copies) | Out-Null
      }
      $timeout = 30
      if ($null -ne $config.defaultTimeoutSeconds) {
        [int]::TryParse([string]$config.defaultTimeoutSeconds, [ref]$timeout) | Out-Null
      }

      Invoke-BarTenderPrint -BarTenderExe $barTenderExe -FormatPath $formatPath -Printer $printer -Copies $copies -Data $payload.data -TimeoutSeconds $timeout

      $script:LastResult = @{ ok = $true; message = 'Print job submitted'; template = $templateKey; time = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
      Write-JsonResponse -Response $res -StatusCode 200 -Body @{ code = 200; message = 'Print job submitted'; template = $templateKey }
    } catch {
      $script:LastResult = @{ ok = $false; message = $_.Exception.Message; time = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
      Write-JsonResponse -Response $res -StatusCode 500 -Body @{ code = 500; message = $_.Exception.Message }
    }
  }
}
finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
