@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Dashboard SIES - servidor local
echo  Abriendo http://localhost:8765/frontend_vue.html
echo  Cierra esta ventana para detener el servidor.
echo.
start "" "http://localhost:8765/frontend_vue.html"
python -m http.server 8765
