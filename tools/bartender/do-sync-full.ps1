Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'

Write-Host 'Triggering gateway sync (full payload)...'
$payload = @{
  manifestUrl = 'http://localhost:8090/api/print-template/manifest'
  templateDir = 'D:\MES\BarTender\Templates'
  localManifestPath = 'e:\vue\ERP\tools\bartender\template-manifest.local.json'
  authToken = 'Admin-Token=eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIxM2JjZWFkZjIxNmY0YWY3YjIwZDQwYzE3ODY2MDFkOSIsInN1YiI6IjEiLCJpc3MiOiJzZyIsImlhdCI6MTc3NjIzOTA2NywiZXhwIjoxNzc2NTk5MDY3fQ.7Xfva8XC-b3B2m2fvsOq_PT9S93EpXZA_cbCKPtPeWg'
} | ConvertTo-Json -Depth 10

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
Write-Host '\n--- /last ---'
try { Invoke-RestMethod -Uri 'http://127.0.0.1:9123/last' -Method Get | ConvertTo-Json -Depth 10 | Write-Host } catch { Write-Host 'ERR /last:' $_.Exception.Message }














Write-Host 'authToken cleared.'$cfg | ConvertTo-Json -Depth 10 | Set-Content $cfgPath -Encoding UTF8$cfg.authToken = ''$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json$cfgPath = '.\sync-config.json'Write-Host '\nCleaning authToken from sync-config.json...'# Clean up: remove authToken from sync-config.jsontry { Invoke-RestMethod -Uri 'http://127.0.0.1:9123/config' -Method Get | ConvertTo-Json -Depth 10 | Write-Host } catch { Write-Host 'ERR /config:' $_.Exception.Message }Write-Host '\n--- gateway /config ---'if (Test-Path .\template-manifest.local.json) { Get-Content .\template-manifest.local.json -Raw | Write-Host } else { Write-Host 'NOT_FOUND' }nWrite-Host '\n--- local template-manifest.local.json ---'