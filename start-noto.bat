@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================================
::  Noto one-click start (fixed: wait for server, then open browser)
:: ============================================================

set "REPO_URL=https://github.com/blackningtop-ctrl/noto.git"
set "DEFAULT_DIR=%USERPROFILE%\Desktop\notion-clone"
set "PORT=5173"
set "HOST=0.0.0.0"

title Noto - launcher
echo.
echo  ========================================
echo   Noto  start
echo  ========================================
echo.

set "WORK=%~dp0"
cd /d "%WORK%" 2>nul

if not exist "package.json" (
  echo [info] No project here. Using %DEFAULT_DIR%
  set "WORK=%DEFAULT_DIR%"
  if not exist "%WORK%\package.json" (
    call :ensure_git
    if errorlevel 1 goto :fail
    echo [Git] cloning...
    if exist "%WORK%" rmdir /s /q "%WORK%" 2>nul
    git clone "%REPO_URL%" "%WORK%"
    if errorlevel 1 (
      echo [error] git clone failed.
      goto :fail
    )
  )
  cd /d "%WORK%"
)

echo [folder] %CD%
echo.

call :ensure_node
if errorlevel 1 goto :fail

if exist ".git" (
  where git >nul 2>&1
  if not errorlevel 1 (
    echo [Git] git pull...
    git pull --ff-only 2>nul
    echo.
  )
)

if not exist "node_modules\" (
  echo [npm] installing packages (first time can take 1-2 min)...
  call npm.cmd install
  if errorlevel 1 (
    echo [error] npm install failed.
    goto :fail
  )
  echo.
)

:: free port
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  echo [port] kill old process %%p
  taskkill /F /PID %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start server in a NEW window so this launcher can wait + open browser
echo [server] starting on port %PORT% ...
start "Noto Server" /D "%CD%" cmd /k "title Noto Server - keep open & npm.cmd run dev -- --host %HOST% --port %PORT%"

:: Wait until http://localhost:PORT responds (max ~60s)
echo [wait] waiting for server ready...
set /a tries=0
:wait_loop
set /a tries+=1
if !tries! GTR 60 (
  echo [error] Server did not start in 60 seconds.
  echo         Look at the "Noto Server" window for errors.
  goto :fail
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto :wait_loop
)

echo [ok] server is up.
echo [browser] opening http://localhost:%PORT%/
start "" "http://localhost:%PORT%/"

echo.
echo  ========================================
echo   Browser should open now.
echo   Keep the "Noto Server" window open.
echo   Close "Noto Server" window to stop.
echo  ========================================
echo.
echo This launcher window can be closed.
timeout /t 8 /nobreak >nul
exit /b 0

:ensure_node
where node >nul 2>&1
if not errorlevel 1 (
  for /f "tokens=*" %%v in ('node -v') do echo [Node] %%v
  where npm.cmd >nul 2>&1
  if errorlevel 1 (
    echo [error] npm not found. Reinstall Node.js LTS.
    exit /b 1
  )
  exit /b 0
)
echo [Node] not found. Trying winget...
where winget >nul 2>&1
if errorlevel 1 (
  echo Install from https://nodejs.org then run again.
  exit /b 1
)
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo Close this window and double-click again after Node install.
  exit /b 1
)
exit /b 0

:ensure_git
where git >nul 2>&1
if not errorlevel 1 exit /b 0
echo [Git] not found. Trying winget...
where winget >nul 2>&1
if errorlevel 1 (
  echo Install from https://git-scm.com
  exit /b 1
)
winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>&1
if errorlevel 1 (
  echo Close and run again after Git install.
  exit /b 1
)
exit /b 0

:fail
echo.
echo FAILED. Read the messages above.
pause
exit /b 1
