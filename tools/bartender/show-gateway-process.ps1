Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Get-CimInstance Win32_Process -Filter "name='powershell.exe'" |
  Select-Object ProcessId, CommandLine |
  Where-Object { $_.CommandLine -match 'start-gateway\.ps1|MES-BarTender-Gateway' } |
  Format-List
