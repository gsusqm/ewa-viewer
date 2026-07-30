@echo off
title EWA Viewer - Backend
echo ============================================
echo  EWA DWG/DXF Viewer
echo  Iniciando Backend (FastAPI)
echo ============================================
echo.
set "PATH=%PATH%;C:\Program Files\ODA\ODAFileConverter 27.1.0"
cd /d "%~dp0backend"
echo Servidor disponible en: http://127.0.0.1:8002
echo Documentacion API: http://127.0.0.1:8002/docs
echo.
python main.py
pause
