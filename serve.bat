@echo off
echo Stopping any existing server on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Checking for Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3 from https://www.python.org
    pause
    exit /b 1
)

echo Starting PrintTrack server...
start "PrintTrack Server" python -m http.server 8080
timeout /t 2 /nobreak >nul

echo.
echo Done! PrintTrack is running at:
echo.
echo   Operator Tracker:      http://localhost:8080
echo   Manager Dashboard:     http://localhost:8080/manager/
echo   Production Dashboard:  http://localhost:8080/dashboard/
echo.
echo Keep the "PrintTrack Server" window open while you work.
echo Close it to stop the server.
echo.
pause
