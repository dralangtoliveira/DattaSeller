# DattaSeller local

MVP local derivado do Prospector, com SQLite, dashboard e MCP. A origem integral está em `vendor/prospector-original`; ela não deve ser editada.

## Executar

1. Instale Python 3.12 e `mcp[cli]` se desejar usar o MCP.
2. Copie `app/prospector-config.example.json` para `app/prospector-config.json` e preencha somente dados aprovados.
3. Execute `app/iniciar-dashboard.bat` ou `python app/dashboard-server.py`.
4. Abra `http://127.0.0.1:8765`.

O banco é criado em `data/dattaseller-local.db`. O checkout Datta VPS permanece desabilitado enquanto a URL oficial, oferta e preço não forem configurados. Contato externo, publicação, proposta e fechamento exigem aprovação humana explícita.
