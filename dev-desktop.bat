@echo off
echo Starting AuditoriumX Desktop Development Environment...
echo.

echo [1/3] Starting Backend Server...
start "Backend" cmd /k "cd backend && npm run dev"

echo [2/3] Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo [3/3] Starting Frontend and Tauri...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo [4/4] Waiting for frontend to start...
timeout /t 5 /nobreak > nul

echo [5/5] Launching Tauri Desktop App...
cd frontend && npm run tauri:dev

echo.
echo Development environment started!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:8081
echo Tauri Desktop App: Should open automatically
