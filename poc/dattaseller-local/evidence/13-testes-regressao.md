# Testes de regressão

| Verificação | Resultado |
| --- | --- |
| Compilação Python de `dashboard-server.py` e `prospector-mcp.py` | passou |
| Autoteste original MCP | `AUTOTESTE OK` |
| Autoteste MCP adaptado | `AUTOTESTE OK` |
| Deduplicação por telefone normalizado | passou; atualizou o slug existente |
| Deduplicação por domínio normalizado | passou; atualizou o slug existente |
| CRUD local via API do dashboard | passou |
| Persistência após reinício do servidor | passou |
| Fechamento sem confirmação | bloqueado com HTTP 400 |
| Fechamento confirmado com valor positivo | passou; gravou `valor_fechado=100` e data de confirmação |
| Nove views do dashboard em 360, 375, 768, 1024, 1280 e 1440 px | passou; sem overflow horizontal, navegação oculta ou erro de página |
| Segredos/HostGator no HTML e API de configuração | ausentes |
| Oferta DattaVPS incompleta ou HTTP | bloqueada |
| Apresentação e clique DattaVPS | passaram; eventos e estado de entrega separados |

Os dados de verificação foram removidos ao final do teste.
