Set-StrictMode -Version Latest
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match 'start-gateway.ps1') } | Select-Object ProcessId,CommandLine | ForEach-Object { Write-Host "PID=$($_.ProcessId) CMD=$($_.CommandLine)`n" }
$net = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 9123 }
if ($net) { $net | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table | Out-Host } else { Write-Host 'No listener on 9123' }
