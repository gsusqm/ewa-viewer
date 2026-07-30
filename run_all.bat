@echo off
title EWA Viewer - Backend
echo ============================================
echo  EWA DWG/DXF Viewer - Iniciando Backend
echo ============================================
echo.
set PATH=%PATH%;C:\Program Files\ODA\ODAFileConverter 27.1.0
cd /d "%~dp0backend"
python main.py
pause
