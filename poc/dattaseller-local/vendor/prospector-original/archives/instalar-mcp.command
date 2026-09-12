#!/bin/bash
echo "Instalando a biblioteca MCP (uma vez so)..."
pip3 install "mcp[cli]" && echo "[OK] Pronto! Agora registre o MCP no ChatGPT ou no Claude - veja o LEIA-ME.md" || echo "[ERRO] Confira se o Python 3 esta instalado."
read -p "Pressione Enter para fechar..."
