@echo off
chcp 65001 >nul
setlocal EnableExtensions

REM ============================================================
REM  Noto one-click start
REM  - Opens server in a separate window
REM  - Waits until ready, THEN opens the browser
REM ============================================================

set "REPO_URL=https://github.com/blackningtop-ctrl/noto.git"
set "DEFAULT_DIR=%USERPROFILE%\Desktop\notion-clone"
set "PORT=5173"

title Noto launcher
echo.
echo  ========================================
echo   Noto start
echo  ========================================
echo.

set "WORK=%~dp0"
cd /d "%WORK%" 2>nul

if exist "package.json" goto :have_project

echo [info] Project not in this folder. Using:
echo        %DEFAULT_DIR%
set "WORK=%DEFAULT_DIR%"
if exist "%WORK%\package.json" goto :cd_work

where git >nul 2>&1
if errorlevel 1 (
  echo [Git] Not found. Trying winget install...
  winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
  set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
)
where git >nul 2>&1
if errorlevel 1 (
  echo [error] Install Git from https://git-scm.com then try again.
  goto :fail
)

echo [Git] Cloning repository...
if exist "%WORK%" rmdir /s /q "%WORK%" 2>nul
git clone "%REPO_URL%" "%WORK%"
if errorlevel 1 (
  echo [error] git clone failed. Check internet.
  goto :fail
)

:cd_work
cd /d "%WORK%"

:have_project
echo [folder] %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [Node] Not found. Trying winget install...
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
where node >nul 2>&1
if errorlevel 1 (
  echo [error] Install Node.js LTS from https://nodejs.org
  echo         Then close this window and double-click again.
  goto :fail
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [error] npm not found. Reinstall Node.js.
  goto :fail
)
for /f "tokens=*" %%v in ('node -v') do echo [Node] %%v
echo.

if exist ".git" (
  echo [Git] Updating...
  git pull --ff-only
  echo.
)

if not exist "node_modules\" (
  echo [npm] Installing packages first time. Please wait...
  call npm.cmd install
  if errorlevel 1 (
    echo [error] npm install failed.
    goto :fail
  )
  echo.
)

REM Kill old server on this port (best effort)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [server] Starting...
start "Noto Server" /D "%CD%" cmd /k "npm.cmd run dev -- --host 0.0.0.0 --port %PORT%"

echo [wait] Waiting for http://localhost:%PORT% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ok=$false; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%/' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -ge 200){ $ok=$true; break } } catch {} ; Start-Sleep -Seconds 1 }; if(-not $ok){ Write-Host 'TIMEOUT'; exit 1 }; Write-Host 'READY'; exit 0"
if errorlevel 1 (
  echo [error] Server did not become ready in 60 seconds.
  echo         Check the window titled "Noto Server" for the error.
  goto :fail
)

echo [ok] Opening browser...
start "" "http://localhost:%PORT%/"

echo.
echo  ========================================
echo   Browser should open now.
echo   Keep "Noto Server" window open while using Noto.
echo   Close "Noto Server" to stop the app.
echo  ========================================
echo.
echo This launcher will close in 6 seconds...
timeout /t 6 /nobreak >nul
exit /b 0

:fail
echo.
echo FAILED. Read the messages above, then press a key.
pause
exit /b 1
