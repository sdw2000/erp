Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$p1 = 'E:\vue\ERP\tools\bartender\config.json'
$p2 = 'C:\Users\Administrator\AppData\Local\MES-BarTender-Gateway\config.json'

Write-Host '--- exists ---'
[PSCustomObject]@{ Path = $p1; Exists = (Test-Path $p1) } | ConvertTo-Json | Write-Host
[PSCustomObject]@{ Path = $p2; Exists = (Test-Path $p2) } | ConvertTo-Json | Write-Host

if (Test-Path $p2) {
  Write-Host "`n--- C config templates paths ---"
  $c = Get-Content $p2 -Raw | ConvertFrom-Json
  $c.templates.PSObject.Properties | ForEach-Object {
    Write-Host ("{0} => {1}" -f $_.Name, $_.Value.formatPath)
  }
}

if (Test-Path $p1) {
  Write-Host "`n--- E config templates paths ---"
  $e = Get-Content $p1 -Raw | ConvertFrom-Json
  $e.templates.PSObject.Properties | ForEach-Object {
    Write-Host ("{0} => {1}" -f $_.Name, $_.Value.formatPath)
  }
}
