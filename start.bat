@echo off
echo Starting BrewHub...

:: Get current WiFi IP address (the adapter with a default gateway, so
:: virtual adapters like VirtualBox/Hyper-V are skipped)
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | Select-Object -First 1).IPv4Address.IPAddress"`) do set IP=%%a

echo Detected IP: %IP%

:: Update frontend .env
echo VITE_API_BASE_URL=http://%IP%:8000> "%~dp0frontend\.env"
echo Updated .env with IP: %IP%

:: Start backend in a new window
start "BrewHub Backend" cmd /k "cd /d "%~dp0Backend" && v\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Small delay to let backend start
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
start "BrewHub Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host"

echo.
echo ================================================
echo  Both servers are starting...
echo  Open on iPad: http://%IP%:8080
echo  Admin login:  http://%IP%:8080/admin/login
echo ================================================
echo.
pause
