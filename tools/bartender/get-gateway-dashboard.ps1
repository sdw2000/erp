try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9123/dashboard' -Method GET -TimeoutSec 30
  Write-Host "--- DASHBOARD ---"
  Write-Host $r.Content
  Write-Host "--- END ---"
  exit 0
} catch {
  Write-Host "ERR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $s = $_.Exception.Response.GetResponseStream(); $sr = New-Object System.IO.StreamReader($s); Write-Host $sr.ReadToEnd(); $sr.Close() } catch {}
  }
  exit 1
}
