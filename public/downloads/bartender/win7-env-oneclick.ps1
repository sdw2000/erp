param(
  [string]$PackageDir = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Is-Blank {
  param([object]$Value)
  if ($null -eq $Value) { return $true }
  $text = [string]$Value
  return ([string]::IsNullOrEmpty($text) -or $text.Trim() -eq '')
}

$scriptRoot = $null
try { $scriptRoot = $PSScriptRoot } catch {}
if (Is-Blank $scriptRoot) {
  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if (Is-Blank $PackageDir) {
  $PackageDir = Join-Path $scriptRoot 'packages'
}

function Write-Step {
  param([string]$Text)
  Write-Host ("[STEP] " + $Text) -ForegroundColor Cyan
}

function Is-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Run-Installer {
  param(
    [string]$FilePath,
    [string]$Args
  )
  if (!(Test-Path $FilePath)) {
    throw "Installer not found: $FilePath"
  }
  $p = Start-Process -FilePath $FilePath -ArgumentList $Args -PassThru -Wait
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
    throw "Install failed: $FilePath, ExitCode=$($p.ExitCode)"
  }
  return $p.ExitCode
}

function Resolve-FirstExistingFile {
  param(
    [string]$Dir,
    [string[]]$Candidates
  )
  foreach ($name in $Candidates) {
    $p = Join-Path $Dir $name
    if (Test-Path $p) { return $p }
  }
  return $null
}

if (-not (Is-Admin)) {
  throw 'Please run this script as Administrator.'
}

$os = Get-WmiObject Win32_OperatingSystem
if (-not ([string]$os.Caption -match 'Windows 7')) {
  throw ("This script is for Windows 7 only. Current OS: " + $os.Caption)
}

if ([int]$os.ServicePackMajorVersion -lt 1) {
  throw 'Windows 7 SP1 is required first.'
}

Write-Step "Using package directory: $PackageDir"
if (!(Test-Path $PackageDir)) {
  throw "Package directory not found: $PackageDir"
}

$dotnetExe = Resolve-FirstExistingFile -Dir $PackageDir -Candidates @(
  'NDP48-x86-x64-AllOS-CHS.exe',
  'NDP48-x86-x64-AllOS-ENU.exe',
  'NDP48-x86-x64-AllOS.exe'
)

$wmfMsu = Resolve-FirstExistingFile -Dir $PackageDir -Candidates @(
  'Win7AndW2K8R2-KB3191566-x64.msu',
  'Win7AndW2K8R2-KB3191566-x64'
)

$missing = @()
if (Is-Blank $dotnetExe) { $missing += 'NDP48-x86-x64-AllOS-CHS.exe or NDP48-x86-x64-AllOS-ENU.exe' }
if ($missing.Count -gt 0) {
  Write-Host '[FAIL] Missing installers:' -ForegroundColor Red
  $missing | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Yellow }
  throw 'Place missing files into packages folder and retry.'
}

$needReboot = $false

Write-Step 'Installing .NET Framework 4.8 ...'
$code = Run-Installer -FilePath $dotnetExe -Args '/q /norestart'
if ($code -eq 3010) { $needReboot = $true }
Write-Host '[OK] .NET install finished.' -ForegroundColor Green

if (Is-Blank $wmfMsu) {
  Write-Host '[WARN] WMF installer (KB3191566) not found. Skip WMF upgrade.' -ForegroundColor Yellow
  Write-Host '       Current gateway scripts are compatible with PowerShell 2.0.' -ForegroundColor Yellow
} else {
  Write-Step 'Installing Windows Management Framework 5.1 ...'
  $code = Run-Installer -FilePath 'wusa.exe' -Args ('"' + $wmfMsu + '" /quiet /norestart')
  if ($code -eq 3010) { $needReboot = $true }
  Write-Host '[OK] WMF install finished.' -ForegroundColor Green
}

Write-Host '----------------------------------------' -ForegroundColor DarkGray
if ($needReboot) {
  Write-Host '[DONE] Environment installed. Reboot is required before deployment.' -ForegroundColor Yellow
  Write-Host 'After reboot, run client-oneclick-setup.cmd as Administrator.' -ForegroundColor Yellow
} else {
  Write-Host '[DONE] Environment installed. You can run client-oneclick-setup.cmd now.' -ForegroundColor Green
}
