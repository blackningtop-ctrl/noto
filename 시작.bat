@echo off
:: Korean name wrapper — same as start-noto.bat
cd /d "%~dp0"
call "%~dp0start-noto.bat"
if errorlevel 1 pause
