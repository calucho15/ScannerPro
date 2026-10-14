@echo off
title ScannerPro Launcher
echo ========================================================
echo   Iniciando ScannerPro (Clon de CamScanner Sin Anuncios)
echo ========================================================
echo.
start "ScannerPro Backend" cmd /c "%~dp0run_backend.bat"
timeout /t 2 /nobreak >nul
start "ScannerPro Frontend" cmd /c "%~dp0run_frontend.bat"
echo.
echo Ambos servicios se estan iniciando en ventanas independientes.
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000/docs
echo.
pause
