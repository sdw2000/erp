param(
  [string]$StartupScriptPath = '',
  [string]$HealthUrl = 'http://127.0.0.1:9123/health',
  [int]$IntervalSeconds = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Is-Blank {
  param([object]$Value)
  if ($null -eq $Value) { return $true }
  $text = [string]$Value
  return ([string]::IsNullOrEmpty($text) -or $text.Trim() -eq '')
}

function Test-HealthCompat {
  param([string]$Url)
  try {
    if (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue) {
      $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method GET -TimeoutSec 3
      return ($resp.StatusCode -eq 200)
    }
  } catch {}
  try {
    $req = [System.Net.HttpWebRequest]::Create($Url)
    $req.Method = 'GET'
    $req.Timeout = 3000
    $res = $req.GetResponse()
    try { return ([int]$res.StatusCode -eq 200) } finally { $res.Close() }
  } catch {}
  return $false
}

function Start-StartupScript {
  param([string]$ScriptPath)

  if (!(Test-Path $ScriptPath)) {
    throw "Startup script not found: $ScriptPath"
  }

  $psExe = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
  Start-Process -FilePath $psExe -ArgumentList @('-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',"`"$ScriptPath`"") -WindowStyle Hidden | Out-Null
}

function Get-ScriptRoot {
  $scriptRoot = $null
  try { $scriptRoot = $PSScriptRoot } catch {}
  if (Is-Blank $scriptRoot) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
  }
  return $scriptRoot
}

if ($IntervalSeconds -lt 5) {
  $IntervalSeconds = 5
}

if (Is-Blank $StartupScriptPath) {
  $StartupScriptPath = Join-Path (Get-ScriptRoot) 'startup-with-sync.ps1'
}

$mutexName = 'Global\MES_BARTENDER_WATCHDOG_SINGLE_INSTANCE'
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($false, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
  Write-Host 'Watchdog already running. Exit duplicate instance.' -ForegroundColor Yellow
  return
}

Write-Host "Watchdog started. Health URL: $HealthUrl" -ForegroundColor Green
Write-Host "Startup script: $StartupScriptPath" -ForegroundColor Cyan

$lastStartTs = [datetime]::MinValue

try {
  while ($true) {
    $ok = Test-HealthCompat -Url $HealthUrl
    if (-not $ok) {
      $elapsed = ([datetime]::Now - $lastStartTs).TotalSeconds
      if ($elapsed -ge 15) {
        try {
          Start-StartupScript -ScriptPath $StartupScriptPath
          $lastStartTs = [datetime]::Now
          Write-Host ("Gateway restart triggered: " + $lastStartTs.ToString('yyyy-MM-dd HH:mm:ss')) -ForegroundColor Yellow
        } catch {
          Write-Host ("Gateway restart failed: " + $_.Exception.Message) -ForegroundColor Red
        }
      }
    }
    Start-Sleep -Seconds $IntervalSeconds
  }
} finally {
  if ($mutex) {
    $mutex.ReleaseMutex() | Out-Null
    $mutex.Dispose()
  }
}
