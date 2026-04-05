param(
  [string]$TaskName = 'MES-BarTender-Gateway'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Task removed: $TaskName" -ForegroundColor Yellow
} else {
  Write-Host "Task not found: $TaskName" -ForegroundColor Gray
}
