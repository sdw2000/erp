param(
  [Parameter(Mandatory=$true)][string]$ManifestUrl,
  [string]$TemplateDir = '',
  [string]$LocalManifestPath = '',
  [string]$ConfigPath = '',
  [string]$DefaultPrinter = '',
  [string]$ApiKey = '',
  [string]$AuthToken = ''
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
if (Is-Blank $TemplateDir) { $TemplateDir = Join-Path $scriptRoot 'templates' }
if (Is-Blank $LocalManifestPath) { $LocalManifestPath = Join-Path $scriptRoot 'template-manifest.local.json' }
if (Is-Blank $ConfigPath) { $ConfigPath = Join-Path $scriptRoot 'config.json' }

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
  if (Get-Command ConvertTo-Json -ErrorAction SilentlyContinue) {
    return $Object | ConvertTo-Json -Depth 20
  }
  Add-Type -AssemblyName System.Web.Extensions -ErrorAction SilentlyContinue | Out-Null
  $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  return $serializer.Serialize($Object)
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

function Invoke-HttpGetText {
  param([string]$Url)
  $req = [System.Net.HttpWebRequest]::Create($Url)
  $req.Method = 'GET'
  $req.Timeout = 15000
  if ($ApiKey) { $req.Headers.Add('X-Api-Key', $ApiKey) }
  if ($AuthToken) {
    $req.Headers.Add('token', $AuthToken)
    $req.Headers.Add('X-Token', $AuthToken)
  }
  $resp = $req.GetResponse()
  try {
    $stream = $resp.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    try { return $reader.ReadToEnd() } finally { $reader.Close() }
  } finally {
    $resp.Close()
  }
}

function Download-File {
  param(
    [string]$Url,
    [string]$OutFile,
    [int]$RetryCount = 3
  )
  $lastErr = $null
  for ($i = 0; $i -lt $RetryCount; $i++) {
    try {
      $wc = New-Object System.Net.WebClient
      try {
        if ($ApiKey) { $wc.Headers.Add('X-Api-Key', $ApiKey) }
        if ($AuthToken) {
          $wc.Headers.Add('token', $AuthToken)
          $wc.Headers.Add('X-Token', $AuthToken)
        }
        $wc.DownloadFile($Url, $OutFile)
        return
      } finally {
        $wc.Dispose()
      }
    } catch {
      $lastErr = $_.Exception.Message
      Start-Sleep -Seconds (1 + $i)
    }

    try {
      if (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue) {
        $headers = @{}
        if ($ApiKey) { $headers['X-Api-Key'] = $ApiKey }
        if ($AuthToken) {
          $headers['token'] = $AuthToken
          $headers['X-Token'] = $AuthToken
        }
        Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $OutFile -Headers $headers -TimeoutSec 20
        return
      }
    } catch {
      $lastErr = $_.Exception.Message
      Start-Sleep -Seconds (1 + $i)
    }
  }
  throw ("Download failed: " + $Url + " ; " + $lastErr)
}

function Normalize-DownloadUrl {
  param(
    [string]$ManifestUrl,
    [string]$DownloadUrl
  )
  $u = [string]$DownloadUrl
  if (Is-Blank $u) { return $u }
  if ($u -notmatch '^https?://') {
    return Resolve-AbsoluteUrl -BaseUrl $ManifestUrl -RelativeOrAbsolute $u
  }
  try {
    $du = [Uri]$u
    if ($du.Host -eq '127.0.0.1' -or $du.Host -eq 'localhost') {
      $mu = [Uri]$ManifestUrl
      $builder = New-Object System.UriBuilder($du)
      $builder.Scheme = $mu.Scheme
      $builder.Host = $mu.Host
      $builder.Port = $mu.Port
      return $builder.Uri.AbsoluteUri
    }
  } catch {}
  return $u
}

function Get-FileSha256 {
  param([string]$Path)
  if (Get-Command Get-FileHash -ErrorAction SilentlyContinue) {
    return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLower()
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $fs = [System.IO.File]::OpenRead($Path)
  try {
    $hash = $sha.ComputeHash($fs)
    return ([BitConverter]::ToString($hash)).Replace('-', '').ToLower()
  } finally {
    $fs.Close()
    $sha.Dispose()
  }
}

function Resolve-AbsoluteUrl {
  param([string]$BaseUrl, [string]$RelativeOrAbsolute)
  $u = [string]$RelativeOrAbsolute
  if ($u -match '^https?://') { return $u }
  $base = [Uri]$BaseUrl
  $prefix = $base.Scheme + '://' + $base.Authority
  if ($u.StartsWith('/')) { return $prefix + $u }
  $path = $base.AbsolutePath
  $idx = $path.LastIndexOf('/')
  $folder = if ($idx -ge 0) { $path.Substring(0, $idx + 1) } else { '/' }
  return $prefix + $folder + $u
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

function Set-MapValue {
  param(
    [object]$Map,
    [string]$Key,
    [object]$Value
  )
  if ($null -eq $Map) { return }
  if ($Map -is [System.Collections.IDictionary]) {
    $Map[$Key] = $Value
    return
  }
  $prop = $null
  try { $prop = $Map.PSObject.Properties[$Key] } catch { $prop = $null }
  if ($prop) {
    $prop.Value = $Value
  } else {
    Add-Member -InputObject $Map -MemberType NoteProperty -Name $Key -Value $Value | Out-Null
  }
}

function Get-TemplateTargetKeys {
  param(
    [string]$TemplateKey,
    [string]$FileName
  )

  $k = ([string]$TemplateKey).Trim().ToUpper()
  $fn = ([string]$FileName).Trim().ToLower()

  $bizKeys = @(
    'COATING_ROLL_LABEL',
    'COATING_INBOUND_SHEET',
    'REWINDING_ROLL_LABEL',
    'SLITTING_CORE_LABEL',
    'SLITTING_INNER_LABEL',
    'SLITTING_OUTER_LABEL',
    'SLITTING_PALLET_LABEL'
  )

  if ($bizKeys -contains $k) {
    return @($k)
  }

  if ($k -eq 'COATING' -or $fn -like '*coating*.btw') {
    return @('COATING_ROLL_LABEL', 'COATING_INBOUND_SHEET')
  }

  # 内标（如 fengqineibiao.btw / *inner*.btw）
  if ($k -like '*NEIBIAO*' -or $k -like '*INNER*' -or $fn -like '*neibiao*.btw' -or $fn -like '*inner*.btw') {
    return @('SLITTING_INNER_LABEL')
  }

  # 外标（如 fengqiewaibiao.btw / *outer*.btw）
  if ($k -like '*WAIBIAO*' -or $k -like '*OUTER*' -or $fn -like '*waibiao*.btw' -or $fn -like '*outer*.btw') {
    return @('SLITTING_OUTER_LABEL')
  }

  # 复卷主模板（rolling/rewinding）
  if ($k -eq 'ROLLING' -or $k -eq 'REWINDING' -or $fn -like '*rolling*.btw' -or $fn -like '*rewinding*.btw') {
    return @('REWINDING_ROLL_LABEL', 'SLITTING_CORE_LABEL', 'SLITTING_PALLET_LABEL')
  }

  return @($k)
}

if (Is-Blank $ManifestUrl) {
  throw 'ManifestUrl is required.'
}

if (!(Test-Path $TemplateDir)) {
  New-Item -ItemType Directory -Path $TemplateDir -Force | Out-Null
}

$serverText = Invoke-HttpGetText -Url $ManifestUrl
$serverObj = ConvertFrom-JsonCompat -JsonText $serverText

$records = @()
if ($serverObj -is [System.Collections.IEnumerable] -and -not ($serverObj -is [string])) {
  $records = @($serverObj)
} else {
  $dataRows = Get-MapValue -Map $serverObj -Key 'data'
  if ($null -ne $dataRows) {
    $records = @($dataRows)
  } else {
    $recordRows = Get-MapValue -Map $serverObj -Key 'records'
    if ($null -ne $recordRows) {
      $records = @($recordRows)
    }
  }
}

$localMap = @{}
if (Test-Path $LocalManifestPath) {
  try {
    $localText = Read-TextFileUtf8 -Path $LocalManifestPath
    $localObj = ConvertFrom-JsonCompat -JsonText $localText
    if ($localObj -is [System.Collections.IDictionary]) {
      $localMap = $localObj
    } else {
      foreach ($p in $localObj.PSObject.Properties) { $localMap[$p.Name] = $p.Value }
    }
  } catch {
    $localMap = @{}
  }
}

$updated = 0
$skipped = 0

foreach ($item in $records) {
  $key = [string](Get-MapValue -Map $item -Key 'templateKey')
  if (Is-Blank $key) { continue }

  $version = [string](Get-MapValue -Map $item -Key 'version')
  $sha = ([string](Get-MapValue -Map $item -Key 'sha256')).ToLower()
  $downloadUrl = [string](Get-MapValue -Map $item -Key 'downloadUrl')
  if (Is-Blank $downloadUrl) { continue }
  $downloadUrl = Normalize-DownloadUrl -ManifestUrl $ManifestUrl -DownloadUrl $downloadUrl

  $fileName = [string](Get-MapValue -Map $item -Key 'fileName')
  if (Is-Blank $fileName) { $fileName = ($key + '.btw') }
  $target = Join-Path $TemplateDir $fileName

  $local = $null
  if ($localMap.ContainsKey($key)) { $local = $localMap[$key] }

  $needUpdate = $true
  if ($local -and (Test-Path $target)) {
    $localVersion = [string](Get-MapValue -Map $local -Key 'version')
    $localSha = ([string](Get-MapValue -Map $local -Key 'sha256')).ToLower()
    if ($localVersion -eq $version -and $localSha -eq $sha -and $localSha) {
      $needUpdate = $false
    }
  }

  if (-not $needUpdate) {
    $skipped++
    continue
  }

  $tmp = $target + '.tmp'
  Download-File -Url $downloadUrl -OutFile $tmp

  if ($sha) {
    $realSha = Get-FileSha256 -Path $tmp
    if ($realSha -ne $sha) {
      Remove-Item -Path $tmp -ErrorAction SilentlyContinue
      throw "SHA256 mismatch for $key. expected=$sha actual=$realSha"
    }
  }

  if (Test-Path $target) {
    Copy-Item $target ($target + '.bak') -Force
    Remove-Item $target -Force
  }
  Move-Item $tmp $target -Force

  $localMap[$key] = @{
    version = $version
    sha256 = $sha
    localPath = $target
    fileName = $fileName
    updatedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  }
  $updated++
}

$localJson = ConvertTo-JsonCompat -Object $localMap
Set-Content -Path $LocalManifestPath -Value $localJson -Encoding UTF8

if (Test-Path $ConfigPath) {
  try {
    $cfgText = Read-TextFileUtf8 -Path $ConfigPath
    $cfgObj = ConvertFrom-JsonCompat -JsonText $cfgText
    $templates = Get-MapValue -Map $cfgObj -Key 'templates'
    if ($null -eq $templates) {
      $templates = @{}
      Set-MapValue -Map $cfgObj -Key 'templates' -Value $templates
    }

    foreach ($k in $localMap.Keys) {
      $meta = $localMap[$k]
      $localPath = [string](Get-MapValue -Map $meta -Key 'localPath')
      $fileName = [string](Get-MapValue -Map $meta -Key 'fileName')
      if (Is-Blank $localPath) { continue }

      $targetKeys = @(Get-TemplateTargetKeys -TemplateKey ([string]$k) -FileName $fileName)
      if ($targetKeys.Count -eq 0) { continue }

      foreach ($targetKey in $targetKeys) {
        if (Is-Blank $targetKey) { continue }

        $tpl = Get-MapValue -Map $templates -Key $targetKey
        if ($null -eq $tpl) {
          $tpl = @{}
          Set-MapValue -Map $templates -Key $targetKey -Value $tpl
        }

        Set-MapValue -Map $tpl -Key 'formatPath' -Value $localPath

        $printer = [string](Get-MapValue -Map $tpl -Key 'printer')
        if ((Is-Blank $printer) -and (-not (Is-Blank $DefaultPrinter))) {
          Set-MapValue -Map $tpl -Key 'printer' -Value $DefaultPrinter
        }
      }
    }

    $cfgJson = ConvertTo-JsonCompat -Object $cfgObj
    Set-Content -Path $ConfigPath -Value $cfgJson -Encoding UTF8
    Write-Host ('Config updated from synced templates: ' + $ConfigPath) -ForegroundColor Cyan
  } catch {
    Write-Host ('Config update skipped: ' + $_.Exception.Message) -ForegroundColor Yellow
  }
}

Write-Host ("Template sync done. updated=" + $updated + ", skipped=" + $skipped) -ForegroundColor Green
