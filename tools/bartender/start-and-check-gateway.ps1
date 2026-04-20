Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'
$startPath = Join-Path (Get-Location) 'start-gateway.ps1'
if (Test-Path $startPath) {
  Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$startPath" -WindowStyle Hidden
  Start-Sleep -Seconds 3
  $net = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 9123 }
  if ($net) { $net | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table | Out-Host } else { Write-Host 'No listener on 9123' }
} else {
  Write-Host 'start-gateway.ps1 not found.'
}
