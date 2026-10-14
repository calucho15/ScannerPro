@echo off
title ScannerPro - Frontend Vite
cd /d "%~dp0frontend"
echo Iniciando interfaz web y movil de ScannerPro en http://localhost:5173 ...
npm.cmd run dev -- --host
pause
