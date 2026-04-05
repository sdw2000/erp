@echo off
setlocal EnableExtensions

set "SCRIPT=%~dp0client-oneclick-setup.ps1"
if not exist "%SCRIPT%" (
  if exist "%~dp0client-oneclick-setup.ps1.txt" (
    set "SCRIPT=%~dp0client-oneclick-setup.ps1.txt"
  )
)

if exist "%SCRIPT%" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
  goto :AFTER_RUN
)

echo Local setup script not found. Try online bootstrap...

set "BASE_URL=%~1"
if "%BASE_URL%"=="" (
  set /p BASE_URL=Input server url (e.g. http://192.168.0.138:8080): 
)

if "%BASE_URL%"=="" (
  echo Base URL is empty. Canceled.
  pause
  exit /b 1
)

set "BASE_URL=%BASE_URL:\"=%"
powershell -ExecutionPolicy Bypass -NoProfile -Command "$ErrorActionPreference='Stop'; $raw='%BASE_URL%'; $base=$raw.Trim().TrimEnd('/'); if($base -notmatch '^https?://'){ $base='http://' + $base }; $tmp=Join-Path $env:TEMP 'mes-bt-bootstrap.ps1'; $wc=New-Object System.Net.WebClient; try{ $wc.DownloadFile(($base + '/downloads/bartender/bootstrap-install.ps1'), $tmp) } finally { $wc.Dispose() }; & $tmp -BaseUrl $base"

:AFTER_RUN
if errorlevel 1 (
  echo Setup failed. Please capture the error screen.
  pause
  exit /b 1
)
echo Setup completed.
pause
