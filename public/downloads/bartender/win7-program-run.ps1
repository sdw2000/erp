param(
  [string]$BaseUrl = 'http://192.168.0.138:8080',
  [string]$InstallDir = 'C:\mes-bt\gateway',
  [int]$Port = 9123,
  [string]$Printer = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Is-Blank {
  param([object]$Value)
  if ($null -eq $Value) { return $true }
  $text = [string]$Value
  return ([string]::IsNullOrEmpty($text) -or $text.Trim() -eq '')
}

function ConvertFrom-JsonCompat {
  param([Parameter(Mandatory=$true)][string]$JsonText)
  if (Get-Command ConvertFrom-Json -ErrorAction SilentlyContinue) {
    return $JsonText | ConvertFrom-Json
  }
  Add-Type -AssemblyName System.Web.Extensions -ErrorAction SilentlyContinue | Out-Null
  $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  return $serializer.DeserializeObject($JsonText)
}

function ConvertTo-JsonCompat {
  param([Parameter(Mandatory=$true)][object]$Object)

  function Convert-ToSimpleJsonValue {
    param(
      [object]$Value,
      [int]$Depth = 0
    )

    if ($Depth -gt 20) { return [string]$Value }
    if ($null -eq $Value) { return $null }

    if ($Value -is [string] -or $Value -is [char] -or $Value -is [bool] -or $Value -is [byte] -or $Value -is [sbyte] -or $Value -is [int16] -or $Value -is [uint16] -or $Value -is [int32] -or $Value -is [uint32] -or $Value -is [int64] -or $Value -is [uint64] -or $Value -is [single] -or $Value -is [double] -or $Value -is [decimal]) {
      return $Value
    }

    if ($Value -is [datetime]) {
      return ([datetime]$Value).ToString('yyyy-MM-dd HH:mm:ss')
    }

    if ($Value -is [System.Collections.IDictionary]) {
      $map = @{}
      foreach ($k in $Value.Keys) {
        $map[[string]$k] = Convert-ToSimpleJsonValue -Value $Value[$k] -Depth ($Depth + 1)
      }
      return $map
    }

    if (($Value -is [System.Collections.IEnumerable]) -and -not ($Value -is [string])) {
      $arr = New-Object System.Collections.ArrayList
      foreach ($x in $Value) {
        [void]$arr.Add((Convert-ToSimpleJsonValue -Value $x -Depth ($Depth + 1)))
      }
      return @($arr)
    }

    $obj = @{}
    foreach ($p in $Value.PSObject.Properties) {
      # 仅采集 NoteProperty，避免 PSParameterizedProperty/复杂运行时属性引发循环引用
      if ($p.MemberType -eq 'NoteProperty') {
        try {
          $obj[[string]$p.Name] = Convert-ToSimpleJsonValue -Value $p.Value -Depth ($Depth + 1)
        } catch {
          $obj[[string]$p.Name] = [string]$p.Value
        }
      }
    }

    if ($obj.Count -eq 0) {
      return [string]$Value
    }
    return $obj
  }

  Add-Type -AssemblyName System.Web.Extensions -ErrorAction SilentlyContinue | Out-Null
  $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  $simple = Convert-ToSimpleJsonValue -Value $Object -Depth 0
  return $serializer.Serialize($simple)
}

function Download-FileCompat {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$OutFile
  )
  $wc = New-Object System.Net.WebClient
  try {
    $wc.DownloadFile($Url, $OutFile)
  } finally {
    $wc.Dispose()
  }
}

function Test-HealthCompat {
  param([string]$Url)
  try {
    $req = [System.Net.HttpWebRequest]::Create($Url)
    $req.Method = 'GET'
    $req.Timeout = 3000
    $res = $req.GetResponse()
    try { return ([int]$res.StatusCode -eq 200) } finally { $res.Close() }
  } catch {}
  return $false
}

$BaseUrl = $BaseUrl.Trim().TrimEnd('/')
if ($BaseUrl -notmatch '^https?://') { $BaseUrl = 'http://' + $BaseUrl }

$downloadBase = $BaseUrl + '/downloads/bartender'
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $InstallDir 'templates') -Force | Out-Null

$startGatewayPath = Join-Path $InstallDir 'start-gateway.ps1'
$configPath = Join-Path $InstallDir 'config.json'
$templateConfigPath = Join-Path $InstallDir 'config.latest.generic.json'

Download-FileCompat -Url ($downloadBase + '/start-gateway.ps1') -OutFile $startGatewayPath
Download-FileCompat -Url ($downloadBase + '/config.latest.generic.json') -OutFile $templateConfigPath

# 初始化配置（如果不存在）
if (!(Test-Path $configPath)) {
  Copy-Item $templateConfigPath $configPath -Force
}

# 读取并修正配置
$raw = Get-Content $configPath -Raw
$config = ConvertFrom-JsonCompat -JsonText $raw

if ($config -is [System.Collections.IDictionary]) {
  $config['listenPrefix'] = ('http://127.0.0.1:' + $Port + '/')
  if ([string]::IsNullOrEmpty([string]$config['barTenderExe'])) {
    $config['barTenderExe'] = 'C:/Program Files (x86)/Seagull/BarTender Suite/bartend.exe'
  }
  $templates = $config['templates']
  if ($templates -is [System.Collections.IDictionary]) {
    foreach ($k in @($templates.Keys)) {
      $tpl = $templates[$k]
      if ($tpl -is [System.Collections.IDictionary]) {
        $p = [string]$tpl['formatPath']
        if (Is-Blank $p) {
          if ([string]$k -like 'COATING*') {
            $tpl['formatPath'] = (Join-Path $InstallDir 'templates\coating.btw').Replace('\\','/')
          } else {
            $tpl['formatPath'] = (Join-Path $InstallDir 'templates\rolling.btw').Replace('\\','/')
          }
        }
        if (-not (Is-Blank $Printer)) {
          $tpl['printer'] = $Printer
        }
      }
    }
  }
} else {
  # PS3+ 对象分支
  $config.listenPrefix = ('http://127.0.0.1:' + $Port + '/')
  if ([string]::IsNullOrEmpty([string]$config.barTenderExe)) {
    $config.barTenderExe = 'C:/Program Files (x86)/Seagull/BarTender Suite/bartend.exe'
  }
  if ($config.templates) {
    foreach ($prop in $config.templates.PSObject.Properties) {
      if ($prop.Value) {
        if ([string]::IsNullOrEmpty([string]$prop.Value.formatPath)) {
          if ([string]$prop.Name -like 'COATING*') {
            $prop.Value.formatPath = (Join-Path $InstallDir 'templates\coating.btw').Replace('\\','/')
          } else {
            $prop.Value.formatPath = (Join-Path $InstallDir 'templates\rolling.btw').Replace('\\','/')
          }
        }
        if (-not (Is-Blank $Printer)) {
          $prop.Value.printer = $Printer
        }
      }
    }
  }
}

$configJson = ConvertTo-JsonCompat -Object $config
Set-Content -Path $configPath -Value $configJson -Encoding UTF8

# URLACL（忽略失败）
try { cmd /c ('netsh http add urlacl url=http://127.0.0.1:' + $Port + '/ user=Everyone >nul 2>&1') | Out-Null } catch {}
try { cmd /c ('netsh http add urlacl url=http://localhost:' + $Port + '/ user=Everyone >nul 2>&1') | Out-Null } catch {}

# 启动网关
$psExe = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
Start-Process -FilePath $psExe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',"$startGatewayPath",'-ConfigPath',"$configPath") -WindowStyle Hidden

$healthUrl = ('http://127.0.0.1:' + $Port + '/health')
$ok = $false
for ($i = 0; $i -lt 8; $i++) {
  Start-Sleep -Seconds 1
  if (Test-HealthCompat -Url $healthUrl) { $ok = $true; break }
}

Write-Host '=========================================' -ForegroundColor Cyan
Write-Host ('Install dir: ' + $InstallDir) -ForegroundColor Gray
Write-Host ('Config: ' + $configPath) -ForegroundColor Gray
Write-Host ('Health: ' + $healthUrl) -ForegroundColor Gray
if ($ok) {
  Write-Host 'Gateway start OK' -ForegroundColor Green
} else {
  Write-Host 'Gateway start may have failed. Please run start-gateway.ps1 in foreground to inspect logs.' -ForegroundColor Yellow
}
Write-Host '=========================================' -ForegroundColor Cyan
