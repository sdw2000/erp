Set-StrictMode -Version Latest
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backupRoot = Join-Path $scriptRoot ("backup_user_configs_$(Get-Date -Format yyyyMMddHHmmss)")
New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null
Write-Host "Backup root: $backupRoot"

$users = Get-ChildItem C:\Users -Directory -ErrorAction SilentlyContinue
foreach ($u in $users) {
  $userName = $u.Name
  $userBackup = Join-Path $backupRoot $userName
  New-Item -Path $userBackup -ItemType Directory -Force | Out-Null

  $cfg = Join-Path $u.FullName 'AppData\Local\MES-BarTender-Gateway\config.json'
  $tplDir = Join-Path $u.FullName 'AppData\Local\MES-BarTender-Gateway\templates'

  if (Test-Path $cfg) {
    $dest = Join-Path $userBackup 'config.json'
    Move-Item -Path $cfg -Destination $dest -Force
    Write-Host "Moved $cfg -> $dest"
  }
  if (Test-Path $tplDir) {
    $destTpl = Join-Path $userBackup 'templates'
    Move-Item -Path $tplDir -Destination $destTpl -Force
    Write-Host "Moved $tplDir -> $destTpl"
  }
}

# Also check ProgramData location
$pdCfg = 'C:\ProgramData\MES-BarTender-Gateway\config.json'
$pdTpl = 'C:\ProgramData\MES-BarTender-Gateway\templates'
if (Test-Path $pdCfg -PathType Leaf) {
  $dest = Join-Path $backupRoot 'ProgramData_config.json'
  Move-Item -Path $pdCfg -Destination $dest -Force
  Write-Host "Moved $pdCfg -> $dest"
}
if (Test-Path $pdTpl) {
  $dest = Join-Path $backupRoot 'ProgramData_templates'
  Move-Item -Path $pdTpl -Destination $dest -Force
  Write-Host "Moved $pdTpl -> $dest"
}

Write-Host "Cleanup complete. Backup directory contains:"
Get-ChildItem -Path $backupRoot -Recurse | ForEach-Object { Write-Host $_.FullName }
