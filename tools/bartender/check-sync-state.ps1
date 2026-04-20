Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'

Write-Host '--- sync-config.json ---'
if (Test-Path .\sync-config.json) { Get-Content .\sync-config.json -Raw } else { Write-Host 'NOT_FOUND sync-config.json' }

Write-Host "`n--- gateway /config (http://127.0.0.1:9123/config) ---"
try {
  $cfg = Invoke-RestMethod -Uri 'http://127.0.0.1:9123/config' -Method Get
  $cfg | ConvertTo-Json -Depth 6 | Write-Host
} catch {
  Write-Host 'HTTP_ERR:' $_.Exception.Message
  if ($_.Exception.Response) {
    $s = $_.Exception.Response.GetResponseStream()
    $sr = New-Object System.IO.StreamReader($s)
    Write-Host $sr.ReadToEnd()
    $sr.Close()
  }
}

Write-Host "`n--- local template-manifest.local.json ---"
if (Test-Path .\template-manifest.local.json) { Get-Content .\template-manifest.local.json -Raw } else { Write-Host 'NOT_FOUND template-manifest.local.json' }

Write-Host "`n--- config.json (gateway local config file) ---"
if (Test-Path .\config.json) {
  $c = Get-Content .\config.json -Raw
  $match = Select-String -InputObject $c -Pattern '"templates"' -Context 0,5
  if ($match) { $match } else { Write-Host 'templates node not found in config.json' }
} else { Write-Host 'NOT_FOUND config.json' }

Write-Host "`n--- D:\MES\BarTender\Templates list ---"
if (Test-Path 'D:\MES\BarTender\Templates') { Get-ChildItem 'D:\MES\BarTender\Templates' -File | Select-Object Name,Length | Format-Table } else { Write-Host 'NOT_FOUND D:\MES\BarTender\Templates' }
