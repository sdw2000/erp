Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'

Write-Host 'Running sync-templates.ps1 with explicit params...'
try {
	& .\sync-templates.ps1 -ManifestUrl 'http://localhost:8090/api/print-template/manifest' -TemplateDir 'D:\MES\BarTender\Templates' -LocalManifestPath 'e:\vue\ERP\tools\bartender\template-manifest.local.json' -ConfigPath 'e:\vue\ERP\tools\bartender\config.json' -AuthToken 'Admin-Token=eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIxM2JjZWFkZjIxNmY0YWY3YjIwZDQwYzE3ODY2MDFkOSIsInN1YiI6IjEiLCJpc3MiOiJzZyIsImlhdCI6MTc3NjIzOTA2NywiZXhwIjoxNzc2NTk5MDY3fQ.7Xfva8XC-b3B2m2fvsOq_PT9S93EpXZA_cbCKPtPeWg'
	Write-Host 'SYNC_SCRIPT_EXIT_OK'
} catch {
	Write-Host 'SYNC_SCRIPT_ERROR:' $_.Exception.Message
	if ($_.Exception.InnerException) { Write-Host 'INNER:' $_.Exception.InnerException.Message }
	if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) { Write-Host 'POS:' $_.InvocationInfo.PositionMessage }
}

Write-Host "`n--- manifest file check ---"
if (Test-Path '.\template-manifest.local.json') { Get-Content '.\template-manifest.local.json' -Raw | Write-Host } else { Write-Host 'NOT_FOUND' }

Write-Host "`n--- config file check ---"
if (Test-Path '.\config.json') { Get-Content '.\config.json' -Raw | Select-Object -First 2000 | Write-Host } else { Write-Host 'config.json NOT_FOUND' }














if (Test-Path '.\config.json') { Get-Content '.\config.json' -Raw | Select-Object -First 2000 | Write-Host } else { Write-Host 'config.json NOT_FOUND' }
nWrite-Host '\n--- config file check ---'if (Test-Path '.\template-manifest.local.json') { Get-Content '.\template-manifest.local.json' -Raw | Write-Host } else { Write-Host 'NOT_FOUND' }
nWrite-Host '\n--- manifest file check ---'}  if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) { Write-Host 'POS:' $_.InvocationInfo.PositionMessage }  if ($_.Exception.InnerException) { Write-Host 'INNER:' $_.Exception.InnerException.Message }  Write-Host 'SYNC_SCRIPT_ERROR:' $_.Exception.Message} catch {  Write-Host 'SYNC_SCRIPT_EXIT_OK'  & .\sync-templates.ps1 -ManifestUrl 'http://localhost:8090/api/print-template/manifest' -TemplateDir 'D:\MES\BarTender\Templates' -LocalManifestPath 'e:\vue\ERP\tools\bartender\template-manifest.local.json' -ConfigPath 'e:\vue\ERP\tools\bartender\config.json' -AuthToken 'Admin-Token=eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIxM2JjZWFkZjIxNmY0YWY3YjIwZDQwYzE3ODY2MDFkOSIsInN1YiI6IjEiLCJpc3MiOiJzZyIsImlhdCI6MTc3NjIzOTA2NywiZXhwIjoxNzc2NTk5MDY3fQ.7Xfva8XC-b3B2m2fvsOq_PT9S93EpXZA_cbCKPtPeWg'try {nWrite-Host 'Running sync-templates.ps1 with explicit params...'