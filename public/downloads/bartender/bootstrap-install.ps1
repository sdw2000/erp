param(
  [string]$BaseUrl = '',
  [string]$WorkDir = "$env:TEMP\MES-BarTender-Installer"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Download-FileCompat {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [int]$RetryCount = 3
  )
  $lastErr = $null
  for ($i = 0; $i -lt $RetryCount; $i++) {
    try {
      $wc = New-Object System.Net.WebClient
      try {
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
        Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $OutFile -TimeoutSec 20
        return
      }
    } catch {
      $lastErr = $_.Exception.Message
      Start-Sleep -Seconds (1 + $i)
    }
  }

  if ($lastErr) {
    throw ("Download failed after retries: " + $lastErr)
  }
  throw 'Download failed after retries.'
}

function Build-DownloadUrl {
  param(
    [Parameter(Mandatory=$true)][string]$Base,
    [Parameter(Mandatory=$true)][string]$FileName
  )
  $encoded = [System.Uri]::EscapeDataString($FileName)
  return ($Base.TrimEnd('/') + '/' + $encoded)
}

function Test-HttpGetOk {
  param([Parameter(Mandatory=$true)][string]$Url)
  try {
    $req = [System.Net.HttpWebRequest]::Create($Url)
    $req.Method = 'GET'
    $req.Timeout = 8000
    $resp = $req.GetResponse()
    try {
      return ([int]$resp.StatusCode -ge 200 -and [int]$resp.StatusCode -lt 300)
    } finally {
      $resp.Close()
    }
  } catch {
    return $false
  }
}

function Test-BaseUrlReachable {
  param([Parameter(Mandatory=$true)][string]$Url)
  try {
    $u = [Uri]$Url
    $port = if ($u.Port -gt 0) { $u.Port } elseif ($u.Scheme -eq 'https') { 443 } else { 80 }
    if (Get-Command Test-NetConnection -ErrorAction SilentlyContinue) {
      $r = Test-NetConnection -ComputerName $u.Host -Port $port -WarningAction SilentlyContinue
      return [bool]$r.TcpTestSucceeded
    }
  } catch {}
  return $true
}

function Is-Blank {
  param([object]$Value)
  if ($null -eq $Value) { return $true }
  $text = [string]$Value
  return ([string]::IsNullOrEmpty($text) -or $text.Trim() -eq '')
}

if (Is-Blank $BaseUrl) {
  throw 'BaseUrl is required, for example: http://192.168.0.138:8080'
}

$BaseUrl = $BaseUrl.Trim()
if ($BaseUrl -notmatch '^https?://') {
  $BaseUrl = 'http://' + $BaseUrl
}

$BaseUrl = $BaseUrl.TrimEnd('/')
$downloadBase = "$BaseUrl/downloads/bartender"

if (-not (Test-BaseUrlReachable -Url $BaseUrl)) {
  throw ("Cannot connect to server: " + $BaseUrl + ". Please check server is running, client can access this IP/port, and firewall is open.")
}

New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

$files = @(
  'win7-precheck.ps1',
  'win7-env-oneclick.ps1',
  'sync-templates.ps1',
  'startup-with-sync.ps1',
  'gateway-watchdog.ps1',
  'config.latest.generic.json',
  'client-oneclick-setup.ps1',
  'client-oneclick-setup.cmd',
  'start-gateway.ps1',
  'install-autostart.ps1',
  'uninstall-autostart.ps1'
)

$optionalFiles = @(
  'README-Win7补环境一键安装.txt',
  'README-客户端一键部署.txt',
  'README-模板同步脚本.txt'
)

$allFiles = @($files + $optionalFiles)

foreach ($f in $allFiles) {
  $url = Build-DownloadUrl -Base $downloadBase -FileName $f
  $dst = Join-Path $WorkDir $f
  try {
    Download-FileCompat -Url $url -OutFile $dst
  } catch {
    if ($optionalFiles -contains $f) {
      Write-Host ("Optional file download skipped: " + $f) -ForegroundColor Yellow
      continue
    }
    throw ("Download failed: " + $url + " ; " + $_.Exception.Message)
  }
}

Write-Host "Downloaded files to: $WorkDir" -ForegroundColor Green
$ps1Path = Join-Path $WorkDir 'client-oneclick-setup.ps1'
if (Test-Path $ps1Path) {
  $manifestUrl = $BaseUrl + '/api/print-template/manifest'
  $autoSync = Test-HttpGetOk -Url $manifestUrl
  if (-not $autoSync) {
    Write-Host 'Manifest endpoint requires auth or is unreachable, skip template auto-sync in installer.' -ForegroundColor Yellow
    $manifestUrl = ''
  }
  Write-Host ("Running: " + $ps1Path + " (StrictPrecheck=false, AutoSyncTemplates=" + $autoSync + ", CleanInstall=true)") -ForegroundColor Cyan
  & $ps1Path -StrictPrecheck $false -AutoSyncTemplates $autoSync -ManifestUrl $manifestUrl -CleanInstall $true
} else {
  $cmdPath = Join-Path $WorkDir 'client-oneclick-setup.cmd'
  Write-Host "Running fallback: $cmdPath" -ForegroundColor Cyan
  & $cmdPath
}
