param(
  [string]$GatewayUrl = 'http://127.0.0.1:9123/health'
)

$ErrorActionPreference = 'SilentlyContinue'

function Is-Blank {
  param([object]$Value)
  if ($null -eq $Value) { return $true }
  $text = [string]$Value
  return ([string]::IsNullOrEmpty($text) -or $text.Trim() -eq '')
}

function Write-Result {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Detail
  )
  $flag = if ($Ok) { '[OK]' } else { '[FAIL]' }
  Write-Host ($flag + ' ' + $Name + ' - ' + $Detail)
}

$allOk = $true

# 1) OS
$os = Get-WmiObject Win32_OperatingSystem
$osName = [string]$os.Caption
$isWin7 = $osName -match 'Windows 7'
Write-Result 'Operating System' $isWin7 $osName
if (-not $isWin7) { $allOk = $false }

# 2) Service Pack
$sp = [int]$os.ServicePackMajorVersion
$spOk = $sp -ge 1
Write-Result 'Service Pack' $spOk ("SP" + $sp)
if (-not $spOk) { $allOk = $false }

# 3) PowerShell version
$psv = $PSVersionTable.PSVersion
$psMajor = if ($psv) { [int]$psv.Major } else { 2 }
$psOk = $psMajor -ge 2
Write-Result 'PowerShell Version' $psOk ("v" + $psv)
if (-not $psOk) { $allOk = $false }

# 4) .NET
$dotnet = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -ErrorAction SilentlyContinue).Release
$dotnetOk = $dotnet -ne $null
Write-Result '.NET 4.x Installed' $dotnetOk (if ($dotnetOk) { 'Release=' + $dotnet } else { 'Not found' })
if (-not $dotnetOk) { $allOk = $false }

# 5) BarTender EXE
$barTenderCandidates = @(
  'C:\Program Files\Seagull\BarTender Suite\bartend.exe',
  'C:\Program Files (x86)\Seagull\BarTender Suite\bartend.exe',
  'C:\Program Files\Seagull\BarTender\bartend.exe',
  'C:\Program Files (x86)\Seagull\BarTender\bartend.exe'
)
$barTenderExe = $null
foreach ($p in $barTenderCandidates) {
  if (Test-Path $p) { $barTenderExe = $p; break }
}
$btOk = -not (Is-Blank $barTenderExe)
Write-Result 'BarTender Installed' $btOk (if ($btOk) { $barTenderExe } else { 'bartend.exe not found' })
if (-not $btOk) { $allOk = $false }

# 6) Printer
$printer = Get-WmiObject Win32_Printer | Select-Object -First 1
$printerOk = $printer -ne $null
Write-Result 'Printer Installed' $printerOk (if ($printerOk) { [string]$printer.Name } else { 'No printer' })
if (-not $printerOk) { $allOk = $false }

# 7) Gateway port check
$gatewayOk = $false
try {
  $req = [System.Net.HttpWebRequest]::Create($GatewayUrl)
  $req.Method = 'GET'
  $req.Timeout = 2000
  $resp = $req.GetResponse()
  if ($resp) {
    $gatewayOk = $true
    $resp.Close()
  }
} catch {}
Write-Result 'Gateway Health (optional)' $gatewayOk (if ($gatewayOk) { $GatewayUrl } else { 'Not running yet' })

Write-Host '----------------------------------------'
if ($allOk) {
  Write-Host 'Precheck PASSED: You can run client-oneclick-setup.ps1 now.'
  exit 0
} else {
  Write-Host 'Precheck FAILED: Please fix FAIL items first, then deploy.'
  exit 1
}
