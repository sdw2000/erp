Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'

$payload = @{
  manifestUrl = 'http://localhost:8090/api/print-template/manifest'
  templateDir = 'D:\MES\BarTender\Templates'
  localManifestPath = 'e:\vue\ERP\tools\bartender\template-manifest.local.json'
  configPath = 'e:\vue\ERP\tools\bartender\config.json'
  defaultPrinter = ''
  apiKey = ''
  authToken = 'eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIxM2JjZWFkZjIxNmY0YWY3YjIwZDQwYzE3ODY2MDFkOSIsInN1YiI6IjEiLCJpc3MiOiJzZyIsImlhdCI6MTc3NjIzOTA2NywiZXhwIjoxNzc2NTk5MDY3fQ.7Xfva8XC-b3B2m2fvsOq_PT9S93EpXZA_cbCKPtPeWg'
} | ConvertTo-Json -Depth 10

Write-Host 'POST /sync-templates ...'
try {
  $r = Invoke-RestMethod -Uri 'http://127.0.0.1:9123/sync-templates' -Method POST -Body $payload -ContentType 'application/json' -TimeoutSec 300
  Write-Host 'SYNC RESPONSE:'
  $r | ConvertTo-Json -Depth 10 | Write-Host
} catch {
  Write-Host 'SYNC ERROR:' $_.Exception.Message
  if ($_.Exception.Response) {
    $s = $_.Exception.Response.GetResponseStream()
    $sr = New-Object System.IO.StreamReader($s)
    Write-Host $sr.ReadToEnd()
    $sr.Close()
  }
}

Start-Sleep -Seconds 1
Write-Host "`n--- /last ---"
Invoke-RestMethod -Uri 'http://127.0.0.1:9123/last' -Method Get | ConvertTo-Json -Depth 10 | Write-Host

Write-Host "`n--- manifest updatedAt sample ---"
if (Test-Path '.\template-manifest.local.json') {
  $m = Get-Content '.\template-manifest.local.json' -Raw | ConvertFrom-Json
  $first = $m.PSObject.Properties | Select-Object -First 1
  if ($first) { ($first.Value | ConvertTo-Json -Depth 6) | Write-Host }
} else {
  Write-Host 'NOT_FOUND'
}

Write-Host "`n--- /config (template path sample) ---"
$c = Invoke-RestMethod -Uri 'http://127.0.0.1:9123/config' -Method Get
$c | ConvertTo-Json -Depth 6 | Write-Host
