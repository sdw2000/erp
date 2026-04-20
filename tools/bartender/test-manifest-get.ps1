Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'

Write-Host 'GET with X-Token (raw token value)'
try {
  $h = @{ 'X-Token' = 'eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIxM2JjZWFkZjIxNmY0YWY3YjIwZDQwYzE3ODY2MDFkOSIsInN1YiI6IjEiLCJpc3MiOiJzZyIsImlhdCI6MTc3NjIzOTA2NywiZXhwIjoxNzc2NTk5MDY3fQ.7Xfva8XC-b3B2m2fvsOq_PT9S93EpXZA_cbCKPtPeWg' }
  $r = Invoke-RestMethod -Uri 'http://localhost:8090/api/print-template/manifest' -Method GET -Headers $h -TimeoutSec 30
  $r | ConvertTo-Json -Depth 5 | Write-Host
} catch {
  Write-Host 'ERR X-Token:' $_.Exception.Message
  if ($_.Exception.Response) { $s = $_.Exception.Response.GetResponseStream(); $sr = New-Object System.IO.StreamReader($s); Write-Host $sr.ReadToEnd(); $sr.Close() }
}

Write-Host '\nGET with Cookie: Admin-Token='
try {
  $h = @{ 'Cookie' = 'Admin-Token=eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIxM2JjZWFkZjIxNmY0YWY3YjIwZDQwYzE3ODY2MDFkOSIsInN1YiI6IjEiLCJpc3MiOiJzZyIsImlhdCI6MTc3NjIzOTA2NywiZXhwIjoxNzc2NTk5MDY3fQ.7Xfva8XC-b3B2m2fvsOq_PT9S93EpXZA_cbCKPtPeWg' }
  $r = Invoke-RestMethod -Uri 'http://localhost:8090/api/print-template/manifest' -Method GET -Headers $h -TimeoutSec 30
  $r | ConvertTo-Json -Depth 5 | Write-Host
} catch {
  Write-Host 'ERR Cookie:' $_.Exception.Message
  if ($_.Exception.Response) { $s = $_.Exception.Response.GetResponseStream(); $sr = New-Object System.IO.StreamReader($s); Write-Host $sr.ReadToEnd(); $sr.Close() }
}
