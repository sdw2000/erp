Set-StrictMode -Version Latest
Set-Location 'e:\vue\ERP\tools\bartender'
try {
  $r = Invoke-RestMethod -Uri 'http://127.0.0.1:9123/last' -Method Get -TimeoutSec 30
  $r | ConvertTo-Json -Depth 10 | Out-String | Write-Host
} catch {
  Write-Host 'HTTP_ERR:' $_.Exception.Message
  if ($_.Exception.Response) {
    $s = $_.Exception.Response.GetResponseStream()
    $sr = New-Object System.IO.StreamReader($s)
    Write-Host $sr.ReadToEnd()
    $sr.Close()
  }
}
