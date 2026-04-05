param(
  [string]$TaskName = 'MES-BarTender-Gateway',
  [string]$GatewayScript = 'e:\vue\ERP\tools\bartender\start-gateway.ps1'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (!(Test-Path $GatewayScript)) {
  throw "Gateway script not found: $GatewayScript"
}

$psExe = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$arg = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$GatewayScript`""

$taskUser = if ($env:USERDOMAIN -and $env:USERNAME) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }

$action = New-ScheduledTaskAction -Execute $psExe -Argument $arg
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $taskUser
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Highest

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Auto start MES BarTender local gateway on user logon.' | Out-Null

try {
  Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null
} catch {}

Write-Host "Task registered: $TaskName" -ForegroundColor Green
Write-Host "Trigger: At logon for user $taskUser" -ForegroundColor Cyan
Write-Host "Gateway: $GatewayScript" -ForegroundColor Cyan
