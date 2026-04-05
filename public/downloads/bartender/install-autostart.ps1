param(
  [string]$TaskName = 'MES-BarTender-Gateway',
  [string]$GatewayScript = 'e:\vue\ERP\tools\bartender\startup-with-sync.ps1',
  [string]$WatchdogScript = '',
  [string]$ListenPrefix = 'http://127.0.0.1:9123/'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (!(Test-Path $GatewayScript)) {
  throw "Gateway script not found: $GatewayScript"
}

if ([string]::IsNullOrWhiteSpace([string]$WatchdogScript)) {
  $scriptDir = Split-Path -Parent $GatewayScript
  $WatchdogScript = Join-Path $scriptDir 'gateway-watchdog.ps1'
}

if (!(Test-Path $WatchdogScript)) {
  throw "Watchdog script not found: $WatchdogScript"
}

$psExe = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$arg = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WatchdogScript`""
$taskUser = if ($env:USERDOMAIN -and $env:USERNAME) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }

$registered = $false
if (Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue) {
  $action = New-ScheduledTaskAction -Execute $psExe -Argument $arg
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $taskUser
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
  $principal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Highest

  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Auto start MES BarTender local gateway on user logon.' | Out-Null
  $registered = $true
}

if (-not $registered) {
  try {
    $deleteCmd = 'schtasks /Delete /TN "' + $TaskName + '" /F >nul 2>&1'
    cmd /c $deleteCmd | Out-Null
  } catch {}
  $cmd = '"' + $psExe + '" ' + $arg
  schtasks /Create /TN $TaskName /SC ONLOGON /TR $cmd /RU $taskUser /RL HIGHEST /F | Out-Null
}

try {
  Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null
} catch {}

Write-Host "Task registered: $TaskName" -ForegroundColor Green
Write-Host "Trigger: At logon for user $taskUser" -ForegroundColor Cyan
Write-Host "Watchdog: $WatchdogScript" -ForegroundColor Cyan
Write-Host "Startup script: $GatewayScript" -ForegroundColor Cyan
Write-Host "Health URL: $($ListenPrefix.TrimEnd('/') + '/health')" -ForegroundColor Cyan
