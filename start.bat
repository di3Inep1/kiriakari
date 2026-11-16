@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo 请先安装 Node.js 18 或更高版本，或直接双击 index.html 游玩。
  pause
  exit /b 1
)
node server.cjs --open
pause
