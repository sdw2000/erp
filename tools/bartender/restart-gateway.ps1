Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'

# Stop any running gateway started from start-gateway.ps1
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match 'start-gateway.ps1') }
if ($procs) {
  foreach ($p in $procs) {
    Write-Host "Stopping gateway pid=$($p.ProcessId)"
    try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; Write-Host "Stopped $($p.ProcessId)" } catch { Write-Host "Failed to stop $($p.ProcessId): $_" }
  }
} else { Write-Host 'No gateway process found to stop.' }

Start-Sleep -Milliseconds 500

# Start gateway
$startPath = Join-Path (Get-Location) 'start-gateway.ps1'
if (Test-Path $startPath) {
  Write-Host "Starting gateway: $startPath"
  Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$startPath" -WindowStyle Hidden
  Start-Sleep -Seconds 2
  Write-Host 'Gateway restart triggered.'
} else {
  Write-Host 'start-gateway.ps1 not found in tools directory.'
}
