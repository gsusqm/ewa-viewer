@echo off
title EWA Viewer - Frontend
echo ============================================
echo  EWA DWG/DXF Viewer - Iniciando Frontend
echo ============================================
echo.
cd /d "%~dp0frontend"
echo Abrir en: http://localhost:5173
echo.
npx vite --host
pause
