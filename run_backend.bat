@echo off
title ScannerPro - Backend FastAPI
cd /d "%~dp0backend"
echo Iniciando servidor backend de ScannerPro en http://localhost:8000 ...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
