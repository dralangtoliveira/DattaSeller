# Inventário funcional — DS-MVP-01

Data: 2026-09-13. Fontes comparadas: raiz do repositório, `origin/main`, commits locais, `poc/dattaseller-local`, `vendor/prospector-original`, skills adaptadas, evidências e suítes de teste.

| Componente | Estado | Fonte | Reutilizar | Falta / observação |
|---|---|---|---|---|
| CRM, SQLite, Kanban, dashboard | PRONTO | Prospector CRM adaptado | SIM | UI do núcleo comercial ainda é API local |
| MCP, prospecção, deduplicação | PRONTO | Prospector MCP/skills | SIM | pesquisa pública segue assistida |
| Qualificação, diagnóstico, redesign, comparador, editor | PARCIAL | skills Prospector | SIM | produção de criativos exige operador e fatos públicos |
| Instagram/TikTok, proposta, e-mail, follow-up | PARCIAL | skills + núcleo local | SIM | UI específica e providers reais ficam pós-validação |
| Pedido, checkout, pagamento, contrato, handoff, comissão | PRONTO (mock local) | núcleo local | SIM | adapters reais intencionalmente ausentes |
| Financeiro, configurações, catálogo, DEMO/reset, timeline | PRONTO (API local) | núcleo local | SIM | integração visual incremental |
| Testes/E2E | PARCIAL | Node, MCP e núcleo local | SIM | execução Playwright depende do runtime local disponível |

Proveniência preservada integralmente em `vendor/prospector-original/`, com hashes em `SHA256SUMS.txt`; cópias executáveis ficam em `app/` e `skills/`.
