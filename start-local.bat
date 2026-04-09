@echo off
setlocal

cd /d "%~dp0"

set "PHP_BIN="

where php >nul 2>nul
if %errorlevel%==0 (
    set "PHP_BIN=php"
)

if not defined PHP_BIN if exist "C:\xampp\php\php.exe" (
    set "PHP_BIN=C:\xampp\php\php.exe"
)

if not defined PHP_BIN if exist "C:\laragon\bin\php\php-8.4.4-Win32-vs17-x64\php.exe" (
    set "PHP_BIN=C:\laragon\bin\php\php-8.4.4-Win32-vs17-x64\php.exe"
)

if not defined PHP_BIN (
    echo Could not find php.exe.
    echo Install PHP or edit start-local.bat with your PHP path.
    pause
    exit /b 1
)

set "HOST=127.0.0.1"
set "PORT=8000"

echo Starting Falcon Tools at http://%HOST%:%PORT%/
echo Press Ctrl+C to stop.
echo.

"%PHP_BIN%" -S %HOST%:%PORT% -t .

endlocal
