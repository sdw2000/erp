param(
  [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Is-Blank {
  param([object]$Value)
  if ($null -eq $Value) { return $true }
  $text = [string]$Value
  return ([string]::IsNullOrEmpty($text) -or $text.Trim() -eq '')
}

$scriptRoot = $null
try { $scriptRoot = $PSScriptRoot } catch {}
if (Is-Blank $scriptRoot) {
  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if (Is-Blank $ConfigPath) {
  $ConfigPath = Join-Path $scriptRoot 'config.json'
}

$script:LastPayload = $null
$script:LastResult = $null
$script:GatewayStartedAt = Get-Date
$script:LastSubmittedPrintProcessId = $null

function Wait-PreviousBarTenderPrint {
  param([int]$TimeoutSeconds = 120)

  if ($null -eq $script:LastSubmittedPrintProcessId) { return }
  $pidToWait = 0
  try { $pidToWait = [int]$script:LastSubmittedPrintProcessId } catch { $pidToWait = 0 }
  if ($pidToWait -le 0) { return }

  try {
    $proc = Get-Process -Id $pidToWait -ErrorAction SilentlyContinue
    if ($null -eq $proc) {
      $script:LastSubmittedPrintProcessId = $null
      return
    }
    Wait-Process -Id $pidToWait -Timeout $TimeoutSeconds -ErrorAction SilentlyContinue
  } catch {
  } finally {
    $script:LastSubmittedPrintProcessId = $null
  }
}

function ConvertFrom-JsonCompat {
  param([Parameter(Mandatory=$true)][string]$JsonText)
  if (Get-Command ConvertFrom-Json -ErrorAction SilentlyContinue) {
    return $JsonText | ConvertFrom-Json
  }
  Add-Type -AssemblyName System.Web.Extensions -ErrorAction SilentlyContinue | Out-Null
  $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  return $serializer.DeserializeObject($JsonText)
}

function ConvertTo-JsonCompat {
  param([Parameter(Mandatory=$true)][object]$Object)

  function Convert-ToSimpleJsonValue {
    param(
      [object]$Value,
      [int]$Depth = 0
    )

    if ($Depth -gt 20) { return [string]$Value }
    if ($null -eq $Value) { return $null }

    if ($Value -is [string] -or $Value -is [char] -or $Value -is [bool] -or $Value -is [byte] -or $Value -is [sbyte] -or $Value -is [int16] -or $Value -is [uint16] -or $Value -is [int32] -or $Value -is [uint32] -or $Value -is [int64] -or $Value -is [uint64] -or $Value -is [single] -or $Value -is [double] -or $Value -is [decimal]) {
      return $Value
    }

    if ($Value -is [datetime]) {
      return ([datetime]$Value).ToString('yyyy-MM-dd HH:mm:ss')
    }

    if ($Value -is [System.Collections.IDictionary]) {
      $map = @{}
      foreach ($k in $Value.Keys) {
        $key = [string]$k
        $map[$key] = Convert-ToSimpleJsonValue -Value $Value[$k] -Depth ($Depth + 1)
      }
      return $map
    }

    if (($Value -is [System.Collections.IEnumerable]) -and -not ($Value -is [string])) {
      $arr = New-Object System.Collections.ArrayList
      foreach ($x in $Value) {
        [void]$arr.Add((Convert-ToSimpleJsonValue -Value $x -Depth ($Depth + 1)))
      }
      return @($arr)
    }

    $obj = @{}
    foreach ($p in $Value.PSObject.Properties) {
      # Win7/PS2 兼容：只采集 NoteProperty，避免 ParameterizedProperty 导致循环引用
      if ($p.MemberType -eq 'NoteProperty') {
        try {
          $obj[[string]$p.Name] = Convert-ToSimpleJsonValue -Value $p.Value -Depth ($Depth + 1)
        } catch {
          $obj[[string]$p.Name] = [string]$p.Value
        }
      }
    }

    if ($obj.Count -eq 0) {
      return [string]$Value
    }
    return $obj
  }

  Add-Type -AssemblyName System.Web.Extensions -ErrorAction SilentlyContinue | Out-Null
  $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  $simple = Convert-ToSimpleJsonValue -Value $Object -Depth 0
  return $serializer.Serialize($simple)
}

function New-Record {
  param(
    [string]$Name,
    [object]$Value
  )
  $obj = New-Object PSObject
  Add-Member -InputObject $obj -MemberType NoteProperty -Name Name -Value $Name | Out-Null
  Add-Member -InputObject $obj -MemberType NoteProperty -Name Value -Value $Value | Out-Null
  return $obj
}

function Get-MapValue {
  param(
    [object]$Map,
    [string]$Key
  )
  if ($null -eq $Map) { return $null }
  if ($Map -is [System.Collections.IDictionary]) {
    if ($Map.Contains($Key)) { return $Map[$Key] }
    return $null
  }
  try {
    return $Map.PSObject.Properties[$Key].Value
  } catch {
    return $null
  }
}

function Read-RequestBodyText {
  param([System.Net.HttpListenerRequest]$Request)
  $reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }
}

function Read-TextFileUtf8 {
  param([Parameter(Mandatory=$true)][string]$Path)
  $reader = New-Object System.IO.StreamReader($Path, [System.Text.Encoding]::UTF8)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }
}

function Read-JsonFileCompat {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (!(Test-Path $Path)) { return $null }
  try {
    $txt = Read-TextFileUtf8 -Path $Path
    if (Is-Blank $txt) { return $null }
    return ConvertFrom-JsonCompat -JsonText $txt
  } catch {
    return $null
  }
}

function Save-JsonFileCompat {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][object]$Data
  )
  $json = ConvertTo-JsonCompat -Object $Data
  Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Write-JsonResponse {
  param(
    [Parameter(Mandatory=$true)] [System.Net.HttpListenerResponse]$Response,
    [Parameter(Mandatory=$true)] [int]$StatusCode,
    [Parameter(Mandatory=$true)] [object]$Body
  )
  $json = $null
  try {
    $json = ConvertTo-JsonCompat -Object $Body
  } catch {
    $msg = [string]$_.Exception.Message
    if ($null -eq $msg) { $msg = 'serialize failed' }
    $msg = $msg.Replace('\\', '\\\\').Replace('"', '\\"').Replace("`r", '').Replace("`n", ' ')
    $json = '{"code":500,"message":"serialize failed","detail":"' + $msg + '"}'
  }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Response.Headers['Access-Control-Allow-Origin'] = '*'
  $Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Api-Key, X-Print-Batch-Id, X-PrintBatch-Id, x-print-batch-id, x-printbatch-id'
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
  $Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Api-Key, X-Print-Batch-Id, X-PrintBatch-Id, x-print-batch-id, x-printbatch-id'
  $Response.StatusCode = $StatusCode
  $Response.OutputStream.Close()
}

function Read-ConfigObject {
  param([string]$Path)
  if (!(Test-Path $Path)) {
    throw "Config file not found: $Path"
  }
  return ConvertFrom-JsonCompat -JsonText (Read-TextFileUtf8 -Path $Path)
}

function Save-ConfigObject {
  param(
    [string]$Path,
    [object]$ConfigObject
  )
  $json = ConvertTo-JsonCompat -Object $ConfigObject
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
      $pairs += (New-Record -Name ([string]$k) -Value $Data[$k])
    }
  } else {
    foreach ($p in $Data.PSObject.Properties) {
      $pairs += (New-Record -Name ([string]$p.Name) -Value $p.Value)
    }
  }

  $items = New-Object System.Collections.Generic.List[string]
  foreach ($pair in $pairs) {
    $name = [string]$pair.Name
    if (Is-Blank $name) { continue }

    $v = $pair.Value
    if ($null -eq $v) { continue }

    if ($v -is [string] -or $v -is [ValueType]) {
      $value = Escape-Xml ([string]$v)
      $n = Escape-Xml $name
      $items.Add("<NamedSubString Name=`"$n`"><Value>$value</Value></NamedSubString>")
    } elseif ($v -is [System.Collections.IEnumerable]) {
      $value = Escape-Xml ([string](ConvertTo-JsonCompat -Object $v))
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

function Get-InstalledPrintersSafe {
  $rows = New-Object System.Collections.ArrayList

  # 1) Win10+ 优先 Get-Printer
  if (Get-Command Get-Printer -ErrorAction SilentlyContinue) {
    $raw = @(Get-Printer -ErrorAction SilentlyContinue)
    foreach ($p in $raw) {
      if ($null -eq $p) { continue }
      $name = [string]$p.Name
      if (Is-Blank $name) { continue }
      $obj = New-Object PSObject
      Add-Member -InputObject $obj -MemberType NoteProperty -Name Name -Value $name | Out-Null
      Add-Member -InputObject $obj -MemberType NoteProperty -Name DriverName -Value ([string]$p.DriverName) | Out-Null
      Add-Member -InputObject $obj -MemberType NoteProperty -Name PortName -Value ([string]$p.PortName) | Out-Null
      $status = 0
      try { $status = [int]$p.PrinterStatus } catch {}
      Add-Member -InputObject $obj -MemberType NoteProperty -Name PrinterStatus -Value $status | Out-Null
      [void]$rows.Add($obj)
    }
  }

  # 2) Win7 / 兜底 WMI
  if ($rows.Count -eq 0) {
    $wmis = @(Get-WmiObject Win32_Printer -ErrorAction SilentlyContinue)
    foreach ($w in $wmis) {
      if ($null -eq $w) { continue }
      $name = [string]$w.Name
      if (Is-Blank $name) { continue }
      $obj = New-Object PSObject
      Add-Member -InputObject $obj -MemberType NoteProperty -Name Name -Value $name | Out-Null
      Add-Member -InputObject $obj -MemberType NoteProperty -Name DriverName -Value ([string]$w.DriverName) | Out-Null
      Add-Member -InputObject $obj -MemberType NoteProperty -Name PortName -Value ([string]$w.PortName) | Out-Null
      $status = 0
      try { $status = [int]$w.PrinterStatus } catch {}
      Add-Member -InputObject $obj -MemberType NoteProperty -Name PrinterStatus -Value $status | Out-Null
      [void]$rows.Add($obj)
    }
  }

  return @($rows)
}

function Get-DictionaryKeysCompat {
  param([object]$Obj)
  if ($null -eq $Obj) { return @() }
  if ($Obj -is [System.Collections.IDictionary]) {
    return @($Obj.Keys)
  }
  $keys = New-Object System.Collections.ArrayList
  foreach ($p in $Obj.PSObject.Properties) {
    if ($p.MemberType -eq 'NoteProperty') {
      [void]$keys.Add([string]$p.Name)
    }
  }
  return @($keys)
}

function Get-DashboardData {
  param(
    [object]$CurrentConfig,
    [string]$CurrentConfigPath,
    [string]$CurrentScriptRoot
  )

  $now = Get-Date
  $uptime = 0
  try {
    $uptime = [int](($now - $script:GatewayStartedAt).TotalSeconds)
    if ($uptime -lt 0) { $uptime = 0 }
  } catch {}

  $templates = Get-MapValue -Map $CurrentConfig -Key 'templates'
  $templateKeys = @(Get-DictionaryKeysCompat -Obj $templates)

  $syncCfgPath = Join-Path $CurrentScriptRoot 'sync-config.json'
  $syncCfg = Read-JsonFileCompat -Path $syncCfgPath
  $manifestUrl = [string](Get-MapValue -Map $syncCfg -Key 'manifestUrl')
  $templateDir = [string](Get-MapValue -Map $syncCfg -Key 'templateDir')
  if (Is-Blank $templateDir) { $templateDir = Join-Path $CurrentScriptRoot 'templates' }
  $localManifestPath = [string](Get-MapValue -Map $syncCfg -Key 'localManifestPath')
  if (Is-Blank $localManifestPath) { $localManifestPath = Join-Path $CurrentScriptRoot 'template-manifest.local.json' }

  $localManifest = Read-JsonFileCompat -Path $localManifestPath
  $localManifestKeys = @(Get-DictionaryKeysCompat -Obj $localManifest)

  $syncedCount = 0
  $latestSyncAt = ''
  foreach ($k in $localManifestKeys) {
    $meta = Get-MapValue -Map $localManifest -Key ([string]$k)
    if ($null -eq $meta) { continue }
    $lp = [string](Get-MapValue -Map $meta -Key 'localPath')
    if (-not (Is-Blank $lp) -and (Test-Path $lp)) {
      $syncedCount++
    }
    $ua = [string](Get-MapValue -Map $meta -Key 'updatedAt')
    if (-not (Is-Blank $ua)) {
      if (Is-Blank $latestSyncAt -or ($ua -gt $latestSyncAt)) {
        $latestSyncAt = $ua
      }
    }
  }

  $printers = @(Get-InstalledPrintersSafe)

  return @{
    code = 200
    data = @{
      service = @{
        status = 'online'
        pid = $PID
        startedAt = $script:GatewayStartedAt.ToString('yyyy-MM-dd HH:mm:ss')
        now = $now.ToString('yyyy-MM-dd HH:mm:ss')
        uptimeSeconds = $uptime
        listenPrefix = [string](Get-MapValue -Map $CurrentConfig -Key 'listenPrefix')
        configPath = $CurrentConfigPath
      }
      templates = @{
        configuredCount = $templateKeys.Count
        configuredKeys = $templateKeys
      }
      sync = @{
        manifestUrl = $manifestUrl
        templateDir = $templateDir
        localManifestPath = $localManifestPath
        syncedCount = $syncedCount
        localManifestCount = $localManifestKeys.Count
        latestSyncAt = $latestSyncAt
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
  $syncCfg = Read-JsonFileCompat -Path $syncConfigPath
  if ($null -eq $syncCfg) { $syncCfg = @{} }

  $manifestUrl = [string](Get-MapValue -Map $Payload -Key 'manifestUrl')
  if (Is-Blank $manifestUrl) { $manifestUrl = [string](Get-MapValue -Map $syncCfg -Key 'manifestUrl') }

  $templateDir = [string](Get-MapValue -Map $Payload -Key 'templateDir')
  if (Is-Blank $templateDir) { $templateDir = [string](Get-MapValue -Map $syncCfg -Key 'templateDir') }
  if (Is-Blank $templateDir) { $templateDir = Join-Path $CurrentScriptRoot 'templates' }

  $localManifestPath = [string](Get-MapValue -Map $Payload -Key 'localManifestPath')
  if (Is-Blank $localManifestPath) { $localManifestPath = [string](Get-MapValue -Map $syncCfg -Key 'localManifestPath') }
  if (Is-Blank $localManifestPath) { $localManifestPath = Join-Path $CurrentScriptRoot 'template-manifest.local.json' }

  $configPath = [string](Get-MapValue -Map $Payload -Key 'configPath')
  if (Is-Blank $configPath) { $configPath = [string](Get-MapValue -Map $syncCfg -Key 'configPath') }
  if (Is-Blank $configPath) { $configPath = Join-Path $CurrentScriptRoot 'config.json' }

  $defaultPrinter = [string](Get-MapValue -Map $Payload -Key 'defaultPrinter')
  if (Is-Blank $defaultPrinter) { $defaultPrinter = [string](Get-MapValue -Map $syncCfg -Key 'defaultPrinter') }

  $apiKey = [string](Get-MapValue -Map $Payload -Key 'apiKey')
  if (Is-Blank $apiKey) { $apiKey = [string](Get-MapValue -Map $syncCfg -Key 'apiKey') }

  $authToken = [string](Get-MapValue -Map $Payload -Key 'authToken')
  if (Is-Blank $authToken) { $authToken = [string](Get-MapValue -Map $syncCfg -Key 'authToken') }

  if (Is-Blank $manifestUrl) {
    throw 'manifestUrl is required'
  }

  $newSyncCfg = @{
    manifestUrl = $manifestUrl
    templateDir = $templateDir
    localManifestPath = $localManifestPath
    configPath = $configPath
    defaultPrinter = $defaultPrinter
    apiKey = $apiKey
    authToken = $authToken
  }
  Save-JsonFileCompat -Path $syncConfigPath -Data $newSyncCfg

  & $syncScriptPath -ManifestUrl $manifestUrl -TemplateDir $templateDir -LocalManifestPath $localManifestPath -ConfigPath $configPath -DefaultPrinter $defaultPrinter -ApiKey $apiKey -AuthToken $authToken

  return @{
    manifestUrl = $manifestUrl
    templateDir = $templateDir
    localManifestPath = $localManifestPath
    configPath = $configPath
    syncedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  }
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

function Invoke-BarTenderBatchPrint {
  param(
    [string]$BarTenderExe,
    [array]$Commands,
    [int]$TimeoutSeconds,
    [switch]$Async
  )

  if (!(Test-Path $BarTenderExe)) { throw "BarTender executable not found: $BarTenderExe" }
  $jobs = @($Commands)
  if ($jobs.Count -le 0) { return @{ printed = 0 } }

  $blocks = New-Object System.Collections.Generic.List[string]
  $idx = 0
  foreach ($cmd in $jobs) {
    $idx++
    $formatPath = [string](Get-MapValue -Map $cmd -Key 'formatPath')
    if (Is-Blank $formatPath -or !(Test-Path $formatPath)) { throw "Template file not found: $formatPath" }
    $copies = 1
    [int]::TryParse([string](Get-MapValue -Map $cmd -Key 'copies'), [ref]$copies) | Out-Null
    if ($copies -lt 1) { $copies = 1 }
    $printer = [string](Get-MapValue -Map $cmd -Key 'printer')
    $printerEsc = Escape-Xml $printer
    $formatEsc = Escape-Xml $formatPath
    $namedSubs = Build-NamedSubStringsXml -Data (Get-MapValue -Map $cmd -Key 'data')

    $blocks.Add(@"
  <Command Name="MESPrint_$idx">
    <Print>
      <Format>$formatEsc</Format>
      <PrintSetup>
        <Printer>$printerEsc</Printer>
        <IdenticalCopiesOfLabel>$copies</IdenticalCopiesOfLabel>
      </PrintSetup>
      $namedSubs
    </Print>
  </Command>
"@) | Out-Null
  }

  $xml = @"
<?xml version="1.0" encoding="utf-8"?>
<XMLScript Version="2.0">
$($blocks -join "`n")
</XMLScript>
"@

  $tempXml = Join-Path $env:TEMP ("mes_bt_batch_" + [guid]::NewGuid().ToString('N') + ".xml")
  Set-Content -Path $tempXml -Value $xml -Encoding UTF8
  try {
    $args = "/XMLScriptFile=`"$tempXml`" /X"
    if ($Async) {
      Wait-PreviousBarTenderPrint -TimeoutSeconds ([Math]::Max(120, $TimeoutSeconds))
    }
    $proc = Start-Process -FilePath $BarTenderExe -ArgumentList $args -PassThru -WindowStyle Hidden
    if ($Async) {
      $script:LastSubmittedPrintProcessId = $proc.Id
      Start-Job -ScriptBlock {
        param($procId, $xmlPath)
        try {
          Wait-Process -Id $procId -Timeout 600 -ErrorAction SilentlyContinue
        } catch {}
        Remove-Item -Path $xmlPath -ErrorAction SilentlyContinue
      } -ArgumentList $proc.Id, $tempXml | Out-Null
      return @{ submitted = $true; processId = $proc.Id; accepted = $jobs.Count }
    }
    $finished = $proc.WaitForExit($TimeoutSeconds * 1000)
    if (-not $finished) {
      try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
      throw "BarTender batch timed out after ${TimeoutSeconds}s"
    }
    if ($proc.ExitCode -ne 0) { throw "BarTender batch exit code: $($proc.ExitCode)" }
    return @{ printed = $jobs.Count; processId = $proc.Id }
  } finally {
    if (-not $Async) {
      Remove-Item -Path $tempXml -ErrorAction SilentlyContinue
    }
  }
}

$config = Read-ConfigObject -Path $ConfigPath
$prefix = [string]$config.listenPrefix
if (Is-Blank $prefix) {
  throw 'config.listenPrefix is required'
}

$listener = New-Object System.Net.HttpListener
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
        $board = Get-DashboardData -CurrentConfig $config -CurrentConfigPath $ConfigPath -CurrentScriptRoot $scriptRoot
        Write-JsonResponse -Response $res -StatusCode 200 -Body $board
        continue
      }

      if ($req.HttpMethod -eq 'POST' -and $req.Url.AbsolutePath -eq '/config') {
        $bodyText = Read-RequestBodyText -Request $req
        if (Is-Blank $bodyText) {
          throw 'Request body is empty'
        }
        $newConfig = ConvertFrom-JsonCompat -JsonText $bodyText
        Save-ConfigObject -Path $ConfigPath -ConfigObject $newConfig
        $config = Read-ConfigObject -Path $ConfigPath
        Write-JsonResponse -Response $res -StatusCode 200 -Body @{ code = 200; message = 'Config saved'; data = $config }
        continue
      }

      if ($req.HttpMethod -eq 'POST' -and $req.Url.AbsolutePath -eq '/sync-templates') {
        $bodyText = Read-RequestBodyText -Request $req
        $payload = @{}
        if (-not (Is-Blank $bodyText)) {
          $payload = ConvertFrom-JsonCompat -JsonText $bodyText
        }
        $syncResult = Invoke-TemplateSync -CurrentScriptRoot $scriptRoot -Payload $payload
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

      $bodyText = Read-RequestBodyText -Request $req
      $script:LastPayload = $bodyText

      if (Is-Blank $bodyText) {
        throw 'Request body is empty'
      }

      $payload = ConvertFrom-JsonCompat -JsonText $bodyText
      $batchId = [string]$req.Headers['X-Print-Batch-Id']
      if (Is-Blank $batchId) {
        $batchId = [string]$req.Headers['X-PrintBatch-Id']
      }
      $items = @()
      if ($payload -is [System.Array]) {
        $items = @($payload | ForEach-Object { $_ })
      } else {
        $items = @($payload)
      }
      if ($items.Count -le 0) {
        throw 'payload is empty'
      }
      if (Is-Blank $batchId) {
        $first = $items[0]
        $batchId = [string](Get-MapValue -Map $first -Key 'batchId')
      }

      $allHaveSequence = $true
      $seqMap = @{}
      foreach ($it in $items) {
        $seqNo = 0
        $okSeq = [int]::TryParse([string](Get-MapValue -Map $it -Key 'sequence'), [ref]$seqNo)
        if (-not $okSeq -or $seqNo -le 0) {
          $allHaveSequence = $false
          break
        }
        if ($seqMap.ContainsKey($seqNo)) {
          throw "payload.sequence duplicated: $seqNo"
        }
        $seqMap[$seqNo] = $true
      }
      if ($allHaveSequence) {
        $items = @($items | Sort-Object { [int](Get-MapValue -Map $_ -Key 'sequence') })
      }

      $barTenderExe = [string](Get-MapValue -Map $config -Key 'barTenderExe')
      $timeout = 30
      $defaultTimeout = Get-MapValue -Map $config -Key 'defaultTimeoutSeconds'
      if ($null -ne $defaultTimeout) {
        [int]::TryParse([string]$defaultTimeout, [ref]$timeout) | Out-Null
      }
      if ($timeout -lt 30) { $timeout = 30 }

      $jobResults = New-Object System.Collections.Generic.List[object]
      $idx = 0
      $printCommands = New-Object System.Collections.Generic.List[object]
      foreach ($item in $items) {
        $idx++
        $templateKey = [string](Get-MapValue -Map $item -Key 'template')
        if (Is-Blank $templateKey) {
          throw "payload[$idx].template is required"
        }
        $templates = Get-MapValue -Map $config -Key 'templates'
        $tpl = Get-MapValue -Map $templates -Key $templateKey
        if ($null -eq $tpl) {
          throw "Template not configured: $templateKey"
        }

        $formatPath = [string](Get-MapValue -Map $tpl -Key 'formatPath')
        if (Is-Blank $formatPath -and $templateKey -eq 'COATING') {
          $templatesMap = Get-MapValue -Map $config -Key 'templates'
          $fallbackTpl = Get-MapValue -Map $templatesMap -Key 'COATING_ROLL_LABEL'
          if ($null -ne $fallbackTpl) {
            $fallbackPath = [string](Get-MapValue -Map $fallbackTpl -Key 'formatPath')
            if (-not (Is-Blank $fallbackPath)) {
              $formatPath = $fallbackPath
            }
          }
        }
        if (Is-Blank $formatPath) {
          throw "Template formatPath is empty: $templateKey"
        }
        $printer = [string](Get-MapValue -Map $tpl -Key 'printer')
        $copies = 1
        $itemCopies = Get-MapValue -Map $item -Key 'copies'
        if ($null -ne $itemCopies) {
          [int]::TryParse([string]$itemCopies, [ref]$copies) | Out-Null
        }
        $itemData = Get-MapValue -Map $item -Key 'data'

        $printCommands.Add(@{
          index = $idx
          sequence = if ($allHaveSequence) { [int](Get-MapValue -Map $item -Key 'sequence') } else { $idx }
          template = $templateKey
          formatPath = $formatPath
          printer = $printer
          copies = $copies
          data = $itemData
        }) | Out-Null
      }

      if ($printCommands.Count -gt 1) {
        $batchTimeoutSeconds = [Math]::Max(120, $timeout * [Math]::Max(1, $printCommands.Count))
        $batchResult = Invoke-BarTenderBatchPrint -BarTenderExe $barTenderExe -Commands ($printCommands.ToArray()) -TimeoutSeconds $batchTimeoutSeconds -Async
        foreach ($cmd in $printCommands) {
          $jobResults.Add(@{
            index = $cmd.index
            sequence = $cmd.sequence
            template = $cmd.template
            status = 'accepted'
            processId = $batchResult.processId
          }) | Out-Null
        }
      } else {
        $single = $printCommands[0]
        Invoke-BarTenderPrint -BarTenderExe $barTenderExe -FormatPath ([string](Get-MapValue -Map $single -Key 'formatPath')) -Printer ([string](Get-MapValue -Map $single -Key 'printer')) -Copies ([int](Get-MapValue -Map $single -Key 'copies')) -Data (Get-MapValue -Map $single -Key 'data') -TimeoutSeconds $timeout
        $jobResults.Add(@{
          index = $single.index
          sequence = $single.sequence
          template = $single.template
          status = 'printed'
        }) | Out-Null
      }

      $script:LastResult = @{
        ok = $true
        message = if ($items.Count -gt 1) { 'Print batch accepted (async)' } else { 'Print job submitted' }
        batchId = $batchId
        batchCount = $items.Count
        jobs = $jobResults
        time = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
      }
      Write-JsonResponse -Response $res -StatusCode 200 -Body @{
        code = 200
        message = if ($items.Count -gt 1) { 'Print batch accepted (async)' } else { 'Print job submitted' }
        batchId = $batchId
        batchCount = $items.Count
        jobs = $jobResults
      }
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
