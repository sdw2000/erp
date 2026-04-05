param(
  [string]$InstallDir = "$env:LOCALAPPDATA\MES-BarTender-Gateway",
  [string]$ListenPrefix = "http://127.0.0.1:9123/",
  [string]$TemplateCoating = "",
  [string]$TemplateRewinding = "",
  [string]$Printer = "",
  [string]$ManifestUrl = "",
  [bool]$AutoSyncTemplates = $false,
  [bool]$StrictPrecheck = $false,
  [bool]$CleanInstall = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Is-Blank {
  param([object]$Value)
  if ($null -eq $Value) { return $true }
  $text = [string]$Value
  return ([string]::IsNullOrEmpty($text) -or $text.Trim() -eq '')
}

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
    $wmiDefault = Get-WmiObject Win32_Printer -ErrorAction SilentlyContinue | Where-Object { $_.Default -eq $true } | Select-Object -First 1 -ExpandProperty Name
    if ($wmiDefault) { return [string]$wmiDefault }
  } catch {}
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

function Escape-JsonString {
  param([string]$Value)
  if ($null -eq $Value) { return '' }
  $s = [string]$Value
  # 关键：先把单个反斜杠转义成双反斜杠，保证 Windows 路径可被 JSON 正确解析
  $s = $s.Replace('\', '\\').Replace('"', '\\"')
  $s = $s.Replace("`r", '\\r').Replace("`n", '\\n').Replace("`t", '\\t')
  return $s
}

function Build-ConfigJson {
  param(
    [string]$ListenPrefix,
    [string]$BarTenderExe,
    [string]$TemplateCoating,
    [string]$TemplateRewinding,
    [string]$Printer
  )
@"
{
  "listenPrefix": "$(Escape-JsonString $ListenPrefix)",
  "barTenderExe": "$(Escape-JsonString $BarTenderExe)",
  "defaultTimeoutSeconds": 30,
  "templates": {
    "COATING_ROLL_LABEL": {
      "formatPath": "$(Escape-JsonString $TemplateCoating)",
      "printer": "$(Escape-JsonString $Printer)"
    },
    "COATING_INBOUND_SHEET": {
      "formatPath": "$(Escape-JsonString $TemplateCoating)",
      "printer": "$(Escape-JsonString $Printer)"
    },
    "REWINDING_ROLL_LABEL": {
      "formatPath": "$(Escape-JsonString $TemplateRewinding)",
      "printer": "$(Escape-JsonString $Printer)"
    },
    "SLITTING_CORE_LABEL": {
      "formatPath": "$(Escape-JsonString $TemplateRewinding)",
      "printer": "$(Escape-JsonString $Printer)"
    },
    "SLITTING_INNER_LABEL": {
      "formatPath": "$(Escape-JsonString $TemplateRewinding)",
      "printer": "$(Escape-JsonString $Printer)"
    },
    "SLITTING_OUTER_LABEL": {
      "formatPath": "$(Escape-JsonString $TemplateRewinding)",
      "printer": "$(Escape-JsonString $Printer)"
    },
    "SLITTING_PALLET_LABEL": {
      "formatPath": "$(Escape-JsonString $TemplateRewinding)",
      "printer": "$(Escape-JsonString $Printer)"
    }
  }
}
"@
}

function Test-HealthCompat {
  param([string]$Url)
  try {
    if (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue) {
      $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method GET -TimeoutSec 3
      return ($resp.StatusCode -eq 200)
    }
  } catch {}
  try {
    $req = [System.Net.HttpWebRequest]::Create($Url)
    $req.Method = 'GET'
    $req.Timeout = 3000
    $res = $req.GetResponse()
    try { return ([int]$res.StatusCode -eq 200) } finally { $res.Close() }
  } catch {}
  return $false
}

function Get-DotNetRelease {
  try {
    $v = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -ErrorAction SilentlyContinue).Release
    if ($v) { return [int]$v }
  } catch {}
  return 0
}

function Run-StrictPrecheck {
  param(
    [string]$StartScriptPath,
    [string]$DetectedBarTenderExe,
    [string]$DetectedPrinter
  )

  $issues = New-Object System.Collections.Generic.List[string]

  if (!(Test-Path $StartScriptPath)) {
    [void]$issues.Add("Missing file: $StartScriptPath")
  }

  $psMajor = 2
  try { if ($PSVersionTable -and $PSVersionTable.PSVersion) { $psMajor = [int]$PSVersionTable.PSVersion.Major } } catch {}
  if ($psMajor -lt 2) {
    [void]$issues.Add("PowerShell version too low: $psMajor")
  }

  try {
    $os = Get-WmiObject Win32_OperatingSystem -ErrorAction SilentlyContinue
    if ($os) {
      $name = [string]$os.Caption
      if ($name -match 'Windows 7') {
        $sp = [int]$os.ServicePackMajorVersion
        if ($sp -lt 1) {
          [void]$issues.Add('Windows 7 SP1 is required')
        }
      }
    }
  } catch {}

  $dotnetRelease = Get-DotNetRelease
  if ($dotnetRelease -le 0) {
    [void]$issues.Add('.NET Framework 4.x Full is required')
  }

  if (Is-Blank $DetectedBarTenderExe) {
    [void]$issues.Add('BarTender is not installed (bartend.exe not found)')
  }

  if (Is-Blank $DetectedPrinter) {
    [void]$issues.Add('No printer detected')
  }

  return $issues
}

function Stop-RelatedPowerShellProcesses {
  param([string]$TargetDir)

  if (Is-Blank $TargetDir) { return }
  $target = [string]$TargetDir

  try {
    $items = @(Get-WmiObject Win32_Process -ErrorAction SilentlyContinue)
    foreach ($p in $items) {
      if ($null -eq $p) { continue }
      if ([string]$p.Name -notmatch 'powershell(\.exe)?$') { continue }
      $cmd = [string]$p.CommandLine
      if (Is-Blank $cmd) { continue }
      if ($cmd.IndexOf($target, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or $cmd.IndexOf('MES-BarTender-Gateway', [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
      }
    }
  } catch {}
}

$scriptRoot = $null
try { $scriptRoot = $PSScriptRoot } catch {}
if (Is-Blank $scriptRoot) {
  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
$startScriptSrc = Join-Path $scriptRoot 'start-gateway.ps1'
$startupScriptSrc = Join-Path $scriptRoot 'startup-with-sync.ps1'
$syncScriptSrc = Join-Path $scriptRoot 'sync-templates.ps1'
$watchdogScriptSrc = Join-Path $scriptRoot 'gateway-watchdog.ps1'
$installAutostartSrc = Join-Path $scriptRoot 'install-autostart.ps1'
$uninstallAutostartSrc = Join-Path $scriptRoot 'uninstall-autostart.ps1'

if (!(Test-Path $startScriptSrc)) {
  throw "start-gateway.ps1 not found: $startScriptSrc"
}

$barTenderExe = Find-BarTenderExe
if (Is-Blank $Printer) {
  $Printer = Resolve-DefaultPrinter
}

$precheckIssues = Run-StrictPrecheck -StartScriptPath $startScriptSrc -DetectedBarTenderExe $barTenderExe -DetectedPrinter $Printer
if ($StrictPrecheck -and $precheckIssues.Count -gt 0) {
  Write-Host 'Precheck failed. Missing requirements:' -ForegroundColor Red
  foreach ($x in $precheckIssues) {
    Write-Host (" - " + $x) -ForegroundColor Yellow
  }
  throw 'Strict precheck failed. Please fix the listed items and retry.'
}

if ($CleanInstall -and (Test-Path $InstallDir)) {
  Write-Host "Clean install enabled, removing old files: $InstallDir" -ForegroundColor Yellow
  try {
    if (Test-Path $uninstallAutostartSrc) {
      & $uninstallAutostartSrc | Out-Null
    }
  } catch {}
  Stop-RelatedPowerShellProcesses -TargetDir $InstallDir
  Start-Sleep -Seconds 1
  try {
    Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction Stop
  } catch {
    Write-Host ("Remove old install dir failed: " + $_.Exception.Message) -ForegroundColor Yellow
  }
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

$startScriptDst = Join-Path $InstallDir 'start-gateway.ps1'
$startupScriptDst = Join-Path $InstallDir 'startup-with-sync.ps1'
$syncScriptDst = Join-Path $InstallDir 'sync-templates.ps1'
$watchdogScriptDst = Join-Path $InstallDir 'gateway-watchdog.ps1'
$installAutostartDst = Join-Path $InstallDir 'install-autostart.ps1'
$uninstallAutostartDst = Join-Path $InstallDir 'uninstall-autostart.ps1'
$configPath = Join-Path $InstallDir 'config.json'
$syncConfigPath = Join-Path $InstallDir 'sync-config.json'

Copy-Item $startScriptSrc $startScriptDst -Force
if (Test-Path $startupScriptSrc) { Copy-Item $startupScriptSrc $startupScriptDst -Force }
if (Test-Path $syncScriptSrc) { Copy-Item $syncScriptSrc $syncScriptDst -Force }
if (Test-Path $watchdogScriptSrc) { Copy-Item $watchdogScriptSrc $watchdogScriptDst -Force }
if (Test-Path $installAutostartSrc) { Copy-Item $installAutostartSrc $installAutostartDst -Force }
if (Test-Path $uninstallAutostartSrc) { Copy-Item $uninstallAutostartSrc $uninstallAutostartDst -Force }

if (-not $barTenderExe) {
  Write-Host 'Warning: BarTender not detected. Installation will continue, but print may fail until BarTender is installed.' -ForegroundColor Yellow
  $barTenderExe = 'C:\Program Files (x86)\Seagull\BarTender Suite\bartend.exe'
}

if (Is-Blank $Printer) {
  Write-Host 'Warning: No printer detected. Installation will continue, please configure printer later in Print Config page.' -ForegroundColor Yellow
}

if (Is-Blank $TemplateCoating) {
  $TemplateCoating = Join-Path (Join-Path $InstallDir 'templates') 'coating.btw'
}
if (Is-Blank $TemplateRewinding) {
  # 默认回退到涂布模板，避免 rolling.btw 缺失导致打印失败
  $TemplateRewinding = $TemplateCoating
}

# 若复卷模板不存在但涂布模板存在，自动回退到涂布模板
if ((-not (Is-Blank $TemplateCoating)) -and (Test-Path $TemplateCoating) -and ((Is-Blank $TemplateRewinding) -or (-not (Test-Path $TemplateRewinding)))) {
  $TemplateRewinding = $TemplateCoating
}

if (Is-Blank $ManifestUrl) {
  $ManifestUrl = ''
}

$syncCfg = @"
{
  "manifestUrl": "$(Escape-JsonString $ManifestUrl)",
  "templateDir": "$(Escape-JsonString (Join-Path $InstallDir 'templates'))",
  "localManifestPath": "$(Escape-JsonString (Join-Path $InstallDir 'template-manifest.local.json'))",
  "configPath": "$(Escape-JsonString $configPath)",
  "listenPrefix": "$(Escape-JsonString $ListenPrefix)",
  "defaultPrinter": "$(Escape-JsonString $Printer)",
  "apiKey": "",
  "authToken": ""
}
"@
Set-Content -Path $syncConfigPath -Value $syncCfg -Encoding UTF8

$configJson = Build-ConfigJson -ListenPrefix $ListenPrefix -BarTenderExe $barTenderExe -TemplateCoating $TemplateCoating -TemplateRewinding $TemplateRewinding -Printer $Printer
Set-Content -Path $configPath -Value $configJson -Encoding UTF8

if (Test-Path $installAutostartDst) {
  $autoStartTarget = if (Test-Path $startupScriptDst) { $startupScriptDst } else { $startScriptDst }
  & $installAutostartDst -GatewayScript $autoStartTarget -WatchdogScript $watchdogScriptDst -ListenPrefix $ListenPrefix | Out-Null
}

if ($AutoSyncTemplates -and $ManifestUrl -and (Test-Path $syncScriptDst)) {
  try {
    & $syncScriptDst -ManifestUrl $ManifestUrl -TemplateDir (Join-Path $InstallDir 'templates') -LocalManifestPath (Join-Path $InstallDir 'template-manifest.local.json')
  } catch {
    Write-Host ("Template sync failed: " + $_.Exception.Message) -ForegroundColor Yellow
  }
}

$psExe = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
if (Test-Path $watchdogScriptDst) {
  Start-Process -FilePath $psExe -ArgumentList @('-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',"`"$watchdogScriptDst`"") -WindowStyle Hidden
} else {
  Start-Process -FilePath $psExe -ArgumentList @('-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',"`"$startScriptDst`"") -WindowStyle Hidden
}

$healthOk = $false
$healthUrl = ($ListenPrefix.TrimEnd('/') + '/health')
for ($i = 0; $i -lt 8; $i++) {
  Start-Sleep -Seconds 1
  if (Test-HealthCompat -Url $healthUrl) {
    $healthOk = $true
    break
  }
}

Write-Host '=========================================' -ForegroundColor Cyan
Write-Host 'One-click deployment completed' -ForegroundColor Green
Write-Host "Install dir: $InstallDir" -ForegroundColor Gray
Write-Host "BarTender: $barTenderExe" -ForegroundColor Gray
Write-Host "Printer: $Printer" -ForegroundColor Gray
Write-Host "Gateway URL: $ListenPrefix" -ForegroundColor Gray
Write-Host "Config file: $configPath" -ForegroundColor Gray
Write-Host "Self-healing watchdog: enabled" -ForegroundColor Gray
if ($ManifestUrl) {
  Write-Host "Template manifest: $ManifestUrl" -ForegroundColor Gray
}
if ($healthOk) {
  Write-Host 'Gateway health check: OK' -ForegroundColor Green
} else {
  Write-Host 'Gateway health check: failed. Please check firewall/permissions.' -ForegroundColor Yellow
}
Write-Host 'Note: put .btw template files at paths defined in config.json, or edit paths in Print Config page.' -ForegroundColor Yellow
Write-Host '=========================================' -ForegroundColor Cyan
