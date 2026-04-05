param(
  [string]$InstallDir = "$env:LOCALAPPDATA\MES-BarTender-Gateway",
  [string]$ListenPrefix = "http://127.0.0.1:9123/",
  [string]$TemplateCoating = "",
  [string]$TemplateRewinding = "",
  [string]$Printer = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Find-BarTenderExe {
  $candidates = @(
    'C:\Program Files\Seagull\BarTender Suite\bartend.exe',
    'C:\Program Files (x86)\Seagull\BarTender Suite\bartend.exe',
    'C:\Program Files\Seagull\BarTender\bartend.exe',
    'C:\Program Files (x86)\Seagull\BarTender\bartend.exe'
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

function Resolve-DefaultPrinter {
  try {
    $default = Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1 -ExpandProperty Name
    if ($default) { return [string]$default }
  } catch {}
  try {
    $first = Get-Printer | Select-Object -First 1 -ExpandProperty Name
    if ($first) { return [string]$first }
  } catch {}
  return ''
}

$scriptRoot = $PSScriptRoot
$startScriptSrc = Join-Path $scriptRoot 'start-gateway.ps1'
$installAutostartSrc = Join-Path $scriptRoot 'install-autostart.ps1'
$uninstallAutostartSrc = Join-Path $scriptRoot 'uninstall-autostart.ps1'

if (!(Test-Path $startScriptSrc)) {
  throw "未找到 start-gateway.ps1：$startScriptSrc"
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

$startScriptDst = Join-Path $InstallDir 'start-gateway.ps1'
$installAutostartDst = Join-Path $InstallDir 'install-autostart.ps1'
$uninstallAutostartDst = Join-Path $InstallDir 'uninstall-autostart.ps1'
$configPath = Join-Path $InstallDir 'config.json'

Copy-Item $startScriptSrc $startScriptDst -Force
if (Test-Path $installAutostartSrc) { Copy-Item $installAutostartSrc $installAutostartDst -Force }
if (Test-Path $uninstallAutostartSrc) { Copy-Item $uninstallAutostartSrc $uninstallAutostartDst -Force }

$barTenderExe = Find-BarTenderExe
if (-not $barTenderExe) {
  throw '未检测到 BarTender，请先在客户端安装 BarTender。'
}

if ([string]::IsNullOrWhiteSpace($Printer)) {
  $Printer = Resolve-DefaultPrinter
}
if ([string]::IsNullOrWhiteSpace($Printer)) {
  throw '未检测到打印机，请先在客户端安装并连接标签打印机。'
}

if ([string]::IsNullOrWhiteSpace($TemplateCoating)) {
  $TemplateCoating = Join-Path $InstallDir 'coating.btw'
}
if ([string]::IsNullOrWhiteSpace($TemplateRewinding)) {
  $TemplateRewinding = Join-Path $InstallDir 'rewinding.btw'
}

$configObj = [ordered]@{
  listenPrefix = $ListenPrefix
  barTenderExe = $barTenderExe
  defaultTimeoutSeconds = 30
  templates = [ordered]@{
    COATING_ROLL_LABEL = [ordered]@{
      formatPath = $TemplateCoating
      printer = $Printer
    }
    REWINDING_ROLL_LABEL = [ordered]@{
      formatPath = $TemplateRewinding
      printer = $Printer
    }
  }
}

$configObj | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Encoding UTF8

# 注册开机自启（当前用户登录后）
if (Test-Path $installAutostartDst) {
  & $installAutostartDst -GatewayScript $startScriptDst | Out-Null
}

# 启动网关
$psExe = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
Start-Process -FilePath $psExe -ArgumentList @('-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',"`"$startScriptDst`"") -WindowStyle Hidden
Start-Sleep -Seconds 1

$healthOk = $false
try {
  $healthUrl = ($ListenPrefix.TrimEnd('/') + '/health')
  $resp = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -Method GET -TimeoutSec 3
  if ($resp.StatusCode -eq 200) { $healthOk = $true }
} catch {}

Write-Host '=========================================' -ForegroundColor Cyan
Write-Host '客户端一键部署完成' -ForegroundColor Green
Write-Host "安装目录: $InstallDir" -ForegroundColor Gray
Write-Host "BarTender: $barTenderExe" -ForegroundColor Gray
Write-Host "打印机: $Printer" -ForegroundColor Gray
Write-Host "网关地址: $ListenPrefix" -ForegroundColor Gray
Write-Host "配置文件: $configPath" -ForegroundColor Gray
if ($healthOk) {
  Write-Host '网关健康检查: OK' -ForegroundColor Green
} else {
  Write-Host '网关健康检查: 未通过，请检查防火墙/权限后重试。' -ForegroundColor Yellow
}
Write-Host '说明：请把标签模板文件放到 config.json 指定路径，或在打印配置页修改模板路径。' -ForegroundColor Yellow
Write-Host '=========================================' -ForegroundColor Cyan
