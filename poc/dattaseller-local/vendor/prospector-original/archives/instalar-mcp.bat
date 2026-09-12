@echo off
title Prospector CRM MCP - instalar dependencia
echo Instalando a biblioteca MCP (uma vez so)...
pip install "mcp[cli]"
if %errorlevel%==0 (echo. & echo [OK] Pronto! Agora registre o MCP no ChatGPT ou no Claude - veja o LEIA-ME.md) else (echo. & echo [ERRO] Confira se o Python esta instalado com "Add to PATH".)
pause
