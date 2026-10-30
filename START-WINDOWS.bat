@echo off
cd /d "%~dp0mobile"
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is required. Install a current Node.js LTS release first.
    pause
    exit /b 1
)
if not exist node_modules (
    call npm ci
    if errorlevel 1 (
        pause
        exit /b 1
    )
)
echo Opening Trail Relics React Native web at http://localhost:8081/
call npm run web -- --host localhost
pause
