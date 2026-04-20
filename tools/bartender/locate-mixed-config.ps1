Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$paths = @(
  'E:\vue\ERP\tools\bartender',
  'C:\Users\Administrator\AppData\Local\MES-BarTender-Gateway',
  'C:\ProgramData\MES-BarTender-Gateway'
)

foreach ($p in $paths) {
  if (Test-Path $p) {
    Write-Host ('--- scan in: ' + $p)
    Get-ChildItem -Path $p -Filter *.json -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $txt = Get-Content $_.FullName -Raw -ErrorAction Stop
        if ($txt -match 'yiwei_jineng' -or $txt -match 'MES-BarTender-Gateway\\templates') {
          Write-Host $_.FullName
        }
      } catch {}
    }
  }
}

Write-Host "`n--- gateway dashboard configPath ---"
try {
  $d = Invoke-RestMethod -Uri 'http://127.0.0.1:9123/dashboard' -Method Get
  Write-Host $d.data.service.configPath
} catch {
  Write-Host $_.Exception.Message
}
