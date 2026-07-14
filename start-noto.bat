@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================================
::  Noto 한 번에 실행 스크립트
::  - 이 파일이 있는 폴더에 프로젝트가 있으면 그대로 실행
::  - 없으면 Desktop\notion-clone 에 GitHub 에서 받아서 실행
::  - Node / Git 없으면 winget 으로 설치 안내·시도
::  사용법: 더블클릭
:: ============================================================

set "REPO_URL=https://github.com/blackningtop-ctrl/noto.git"
set "DEFAULT_DIR=%USERPROFILE%\Desktop\notion-clone"
set "PORT=5173"
set "HOST=0.0.0.0"

title Noto - 시작
echo.
echo  ========================================
echo   Noto  로컬 노트 앱  시작
echo  ========================================
echo.

:: --- 작업 폴더 결정 ---
set "WORK=%~dp0"
cd /d "%WORK%" 2>nul

if not exist "package.json" (
  echo [안내] 이 위치에는 프로젝트가 없습니다.
  echo        %DEFAULT_DIR%  를 사용합니다.
  echo.
  set "WORK=%DEFAULT_DIR%"
  if not exist "%WORK%\package.json" (
    call :ensure_git
    if errorlevel 1 goto :fail
    echo [Git] 저장소 복제 중...
    echo        %REPO_URL%
    if exist "%WORK%" (
      echo [경고] 폴더는 있지만 package.json 이 없습니다. 새로 받습니다.
      rmdir /s /q "%WORK%" 2>nul
    )
    git clone "%REPO_URL%" "%WORK%"
    if errorlevel 1 (
      echo [오류] git clone 실패. 인터넷·GitHub 로그인(비공개 저장소)을 확인하세요.
      echo        브라우저에서 저장소를 연 뒤 Personal Access Token 으로 클론할 수 있습니다.
      goto :fail
    )
  )
  cd /d "%WORK%"
)

echo [폴더] %CD%
echo.

:: --- Node.js ---
call :ensure_node
if errorlevel 1 goto :fail

:: --- 최신 코드 (선택) ---
if exist ".git" (
  where git >nul 2>&1
  if not errorlevel 1 (
    echo [Git] 최신 코드 가져오는 중 (git pull)...
    git pull --ff-only
    if errorlevel 1 (
      echo [안내] pull 을 건너뜁니다. (로컬 변경 또는 네트워크)
    )
    echo.
  )
)

:: --- 의존성 ---
if not exist "node_modules\" (
  echo [npm] 처음 설치 중... 잠시 기다려 주세요.
  call npm.cmd install
  if errorlevel 1 (
    echo [오류] npm install 실패.
    goto :fail
  )
  echo.
) else (
  echo [npm] node_modules 있음 — 설치 생략. (문제 있으면: npm install)
  echo.
)

:: --- 포트 정리 (이미 떠 있으면 종료) ---
echo [서버] 포트 %PORT% 확인...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  echo        기존 프로세스 %%p 종료
  taskkill /F /PID %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: --- 브라우저 ---
echo [브라우저] http://localhost:%PORT%  를 엽니다.
start "" "http://localhost:%PORT%/"

:: --- 개발 서버 ---
echo.
echo  ========================================
echo   서버 실행 중  (끄려면 이 창에서 Ctrl+C)
echo   주소: http://localhost:%PORT%/
echo  ========================================
echo.

call npm.cmd run dev -- --host %HOST% --port %PORT%
set "ERR=!errorlevel!"
if not "!ERR!"=="0" (
  echo.
  echo [오류] 서버가 종료되었습니다. 코드: !ERR!
  goto :fail
)
goto :eof

:: -------------------- helpers --------------------
:ensure_node
where node >nul 2>&1
if not errorlevel 1 (
  for /f "tokens=*" %%v in ('node -v') do echo [Node] %%v
  where npm.cmd >nul 2>&1
  if errorlevel 1 (
    echo [오류] node 는 있는데 npm 이 없습니다. Node.js 를 다시 설치하세요.
    exit /b 1
  )
  exit /b 0
)
echo [Node] 설치되어 있지 않습니다.
where winget >nul 2>&1
if errorlevel 1 (
  echo        https://nodejs.org  에서 LTS 를 설치한 뒤 다시 실행하세요.
  exit /b 1
)
echo [Node] winget 으로 LTS 설치 시도...
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo [오류] 자동 설치 실패. https://nodejs.org 에서 수동 설치 후 PATH 새로고침.
  exit /b 1
)
:: 새 PATH 반영 시도
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo [안내] Node 설치 후 터미널을 다시 열어 주세요. (PATH 갱신)
  echo        이 창을 닫고 다시 더블클릭하세요.
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [Node] %%v
exit /b 0

:ensure_git
where git >nul 2>&1
if not errorlevel 1 exit /b 0
echo [Git] 설치되어 있지 않습니다.
where winget >nul 2>&1
if errorlevel 1 (
  echo        https://git-scm.com 에서 Git 을 설치하세요.
  exit /b 1
)
echo [Git] winget 으로 설치 시도...
winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>&1
if errorlevel 1 (
  echo [안내] Git 설치 후 이 창을 닫고 다시 실행하세요.
  exit /b 1
)
exit /b 0

:fail
echo.
echo 실패했습니다. 위 메시지를 확인한 뒤 다시 시도하세요.
echo 비공개 저장소면: gh auth login  또는 GitHub 토큰이 필요할 수 있습니다.
echo.
pause
exit /b 1
