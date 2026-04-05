param(
  [string]$ConfigPath = '',
  [string]$SyncScriptPath = '',
  [string]$GatewayScriptPath = ''
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
if (Is-Blank $ConfigPath) { $ConfigPath = Join-Path $scriptRoot 'sync-config.json' }
if (Is-Blank $SyncScriptPath) { $SyncScriptPath = Join-Path $scriptRoot 'sync-templates.ps1' }
if (Is-Blank $GatewayScriptPath) { $GatewayScriptPath = Join-Path $scriptRoot 'start-gateway.ps1' }

function ConvertFrom-JsonCompat {
  param([Parameter(Mandatory=$true)][string]$JsonText)
  if (Get-Command ConvertFrom-Json -ErrorAction SilentlyContinue) {
    return $JsonText | ConvertFrom-Json
  }
  Add-Type -AssemblyName System.Web.Extensions -ErrorAction SilentlyContinue | Out-Null
  $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  return $serializer.DeserializeObject($JsonText)
}

function Read-TextFileUtf8 {
  param([Parameter(Mandatory=$true)][string]$Path)
  $reader = New-Object System.IO.StreamReader($Path, [System.Text.Encoding]::UTF8)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }
}

try {
  if ((Test-Path $SyncScriptPath) -and (Test-Path $ConfigPath)) {
    $raw = Read-TextFileUtf8 -Path $ConfigPath
    $cfg = ConvertFrom-JsonCompat -JsonText $raw

    $manifestUrl = ''
    $templateDir = (Join-Path $scriptRoot 'templates')
    $localManifestPath = (Join-Path $scriptRoot 'template-manifest.local.json')
    $configPath = (Join-Path $scriptRoot 'config.json')
    $defaultPrinter = ''
    $apiKey = ''
    $authToken = ''

    if ($cfg -is [System.Collections.IDictionary]) {
      if ($cfg.ContainsKey('manifestUrl')) { $manifestUrl = [string]$cfg['manifestUrl'] }
      if ($cfg.ContainsKey('templateDir')) { $templateDir = [string]$cfg['templateDir'] }
      if ($cfg.ContainsKey('localManifestPath')) { $localManifestPath = [string]$cfg['localManifestPath'] }
      if ($cfg.ContainsKey('configPath')) { $configPath = [string]$cfg['configPath'] }
      if ($cfg.ContainsKey('defaultPrinter')) { $defaultPrinter = [string]$cfg['defaultPrinter'] }
      if ($cfg.ContainsKey('apiKey')) { $apiKey = [string]$cfg['apiKey'] }
      if ($cfg.ContainsKey('authToken')) { $authToken = [string]$cfg['authToken'] }
    } else {
      $manifestUrl = [string]$cfg.manifestUrl
      if ($cfg.templateDir) { $templateDir = [string]$cfg.templateDir }
      if ($cfg.localManifestPath) { $localManifestPath = [string]$cfg.localManifestPath }
      if ($cfg.configPath) { $configPath = [string]$cfg.configPath }
      if ($cfg.defaultPrinter) { $defaultPrinter = [string]$cfg.defaultPrinter }
      if ($cfg.apiKey) { $apiKey = [string]$cfg.apiKey }
      if ($cfg.authToken) { $authToken = [string]$cfg.authToken }
    }

    if ($manifestUrl -and $manifestUrl.Trim()) {
      try {
        & $SyncScriptPath -ManifestUrl $manifestUrl -TemplateDir $templateDir -LocalManifestPath $localManifestPath -ConfigPath $configPath -DefaultPrinter $defaultPrinter -ApiKey $apiKey -AuthToken $authToken
      } catch {
        Write-Host ("Template sync on startup failed: " + $_.Exception.Message) -ForegroundColor Yellow
      }
    }
  }
} catch {
  Write-Host ("Startup sync bootstrap failed: " + $_.Exception.Message) -ForegroundColor Yellow
}

if (!(Test-Path $GatewayScriptPath)) {
  throw "Gateway script not found: $GatewayScriptPath"
}

& $GatewayScriptPath
