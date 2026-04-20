param(
  [string]$ManifestUrl = 'http://localhost:8090/api/print-template/manifest'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  $payload = @{ manifestUrl = $ManifestUrl }
  $json = ConvertTo-Json $payload -Depth 10
  Write-Host "Posting to http://127.0.0.1:9123/sync-templates with manifestUrl=$ManifestUrl"
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:9123/sync-templates' -Method POST -Body $json -ContentType 'application/json' -TimeoutSec 180
  Write-Host "--- RESPONSE CONTENT ---"
  Write-Host $resp.Content
  Write-Host "--- END RESPONSE ---"
  exit 0
} catch {
  Write-Host "SYNC_ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $b = $_.Exception.Response.GetResponseStream(); $sr = New-Object System.IO.StreamReader($b); Write-Host $sr.ReadToEnd(); $sr.Close() } catch {}
  }
  exit 1
}
