Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'

Copy-Item -Path 'e:\vue\ERP\public\downloads\bartender\startup-with-sync.ps1' -Destination '.\startup-with-sync.ps1' -Force

$json = '{"manifestUrl":"http://localhost:8090/api/print-template/manifest","templateDir":"D:\\MES\\BarTender\\Templates","localManifestPath":"e:\\vue\\ERP\\tools\\bartender\\template-manifest.local.json","configPath":"e:\\vue\\ERP\\tools\\bartender\\config.json","defaultPrinter":"","apiKey":"","authToken":""}'
$json | Out-File -FilePath '.\sync-config.json' -Encoding UTF8
Write-Host "sync-config.json written to: $(Get-Item .\sync-config.json).FullName"

& '.\install-autostart.ps1' -GatewayScript (Join-Path (Get-Location) 'startup-with-sync.ps1')
Write-Host 'Autostart script executed.'

$payload = @{ manifestUrl='http://localhost:8090/api/print-template/manifest' } | ConvertTo-Json -Depth 10
try {
  $r = Invoke-RestMethod -Uri 'http://127.0.0.1:9123/sync-templates' -Method POST -Body $payload -ContentType 'application/json' -TimeoutSec 120
  Write-Host 'SYNC_OK:'
  Write-Host ($r | ConvertTo-Json -Depth 6)
} catch {
  Write-Host 'SYNC_ERR:'
  Write-Host $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $s = $_.Exception.Response.GetResponseStream()
      $sr = New-Object System.IO.StreamReader($s)
      Write-Host $sr.ReadToEnd()
      $sr.Close()
    } catch {}
  }
}
