@echo off
echo Stopping any existing server on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Starting PrintTrack server in background...
start /min "" pythonw -m http.server 8080
timeout /t 1 /nobreak >nul

echo Done! PrintTrack is running at:
echo.
echo   Operator Tracker:      http://localhost:8080
echo   Manager Dashboard:     http://localhost:8080/manager/
echo   Production Dashboard:  http://localhost:8080/dashboard/
echo.
echo You can close this window. The server will keep running.
pause
