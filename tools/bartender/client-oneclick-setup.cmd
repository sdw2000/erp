@echo off
setlocal
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0client-oneclick-setup.ps1"
if errorlevel 1 (
  echo.
  echo 部署失败，请截图报错信息给管理员。
  pause
  exit /b 1
)
echo.
echo 部署完成。
pause
