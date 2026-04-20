Set-StrictMode -Version Latest
$paths = @('C:\Users\*\AppData\Local\MES-BarTender-Gateway','C:\ProgramData\MES-BarTender-Gateway','C:\MES\BarTender\Templates')
foreach ($p in $paths) {
  Write-Host "--- $p"
  try {
    $items = Get-ChildItem -Path $p -ErrorAction SilentlyContinue -Force
    if ($items) { $items | ForEach-Object { Write-Host $_.FullName } } else { Write-Host 'Not found' }
  } catch { Write-Host 'Err:' $_.Exception.Message }
}
