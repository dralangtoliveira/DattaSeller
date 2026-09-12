# Testes de regressão

| Verificação | Resultado |
| --- | --- |
| Compilação Python de `dashboard-server.py` e `prospector-mcp.py` | passou |
| Autoteste original MCP | `AUTOTESTE OK` |
| Autoteste MCP adaptado | `AUTOTESTE OK` |
| CRUD local via API do dashboard | passou |
| Fechamento sem confirmação | bloqueado com HTTP 400 |
| Fechamento confirmado com valor positivo | passou; gravou `valor_fechado=100` e data de confirmação |

Os dados de verificação foram removidos ao final do teste.
