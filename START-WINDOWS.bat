@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% equ 0 (
    start "" http://127.0.0.1:8000/
    node run_local.cjs
    pause
    exit /b
)
where py >nul 2>nul
if %errorlevel% equ 0 (
    py -3 run_local.py
    pause
    exit /b
)
where python >nul 2>nul
if %errorlevel% equ 0 (
    python run_local.py
    pause
    exit /b
)
echo Python 3 is not installed or not on PATH.
echo You can open public\index.html directly to try the simulator,
echo or install Python 3 from python.org and run this launcher again.
pause
