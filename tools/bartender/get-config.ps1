try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9123/config' -Method GET -UseBasicParsing -TimeoutSec 30
  $content = $r.Content
  try { $obj = $content | ConvertFrom-Json } catch { $obj = $content }
  $txt = $obj | ConvertTo-Json -Depth 10
  Write-Host "--- CONFIG ---"
  Write-Host $txt
  Write-Host "--- END ---"
  exit 0
} catch {
  Write-Host "ERR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $s = $_.Exception.Response.GetResponseStream(); $sr = New-Object System.IO.StreamReader($s); Write-Host $sr.ReadToEnd(); $sr.Close() } catch {}
  }
  exit 1
}
