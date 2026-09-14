# Inventário funcional — DS-MVP-01

Data: 2026-09-13. Fontes comparadas: raiz do repositório, `origin/main`, commits locais, `poc/dattaseller-local`, `vendor/prospector-original`, skills adaptadas, evidências e suítes de teste.

| Componente | Estado | Fonte | Reutilizar | Falta / observação |
|---|---|---|---|---|
| CRM, SQLite, Kanban, dashboard | PRONTO | Prospector CRM adaptado | SIM | central comercial visual validada em 27 |
| MCP, prospecção, deduplicação | PRONTO | Prospector MCP/skills | SIM | pesquisa pública segue assistida |
| Qualificação, diagnóstico, redesign, comparador, editor | PARCIAL | skills Prospector | SIM | produção de criativos exige operador e fatos públicos |
| Instagram/TikTok, proposta, e-mail, follow-up | PARCIAL | skills + núcleo local | SIM | editor de rascunho validado; follow-up visual completo ainda falta |
| Pedido, checkout, pagamento, contrato, handoff, comissão | PRONTO (mock local) | núcleo local | SIM | adapters reais intencionalmente ausentes |
| Financeiro, configurações, catálogo, DEMO/reset, timeline | PRONTO (API local) | núcleo local | SIM | integração visual incremental |
| Testes/E2E | PARCIAL | Node, MCP e núcleo local | SIM | execução Playwright depende do runtime local disponível |

Proveniência preservada integralmente em `vendor/prospector-original/`, com hashes em `SHA256SUMS.txt`; cópias executáveis ficam em `app/` e `skills/`.

## Controle DS-MVP (revisão 2026-09-13)

| ID | Estado | Implementação/teste comprovado | Evidência/commit | Pendência real |
|---|---|---|---|---|
| 01 | PRONTO | inventário e proveniência | 17 / afb44ac | — |
| 02 | PRONTO | seis skills preservadas | vendor + SHA256 | — |
| 03 | PRONTO | CRM SQLite/dashboard e criação visual | b352869 | — |
| 04 | PRONTO | MCP e autoteste | 20 / 1c80d9e | — |
| 05 | PRONTO | operação, provider mock, limites e modo DEMO visuais/persistentes | 28 / suíte Python 10/10 | — |
| 06 | PRONTO | preço/custo/comissão/desconto/moeda/condições/status na UI | c799a1c | — |
| 07 | PRONTO | catálogo, CTA, disponibilidade e checkout HTTPS opcional visuais/persistentes | 37b01ed / 29 / suíte Python 10/10 | — |
| 08 | PRONTO | entrada sem e-mail | 20 / 1c80d9e | — |
| 09 | PRONTO | cinco chaves de dedupe | 20 / 1c80d9e | — |
| 10 | PRONTO | qualificação visual separa fatos, hipóteses e recomendação | 34 | — |
| 11 | PRONTO | preview factual persistido e visual | 8febd6a / 30 | — |
| 12 | PRONTO | comparador antes/depois com preview persistido | e6d8a25 / 31 | — |
| 13 | PRONTO | editor visual e persistência revisada | 921d0c5 / 30 | — |
| 14 | PRONTO | diagnóstico factual criado e exibido visualmente | 34 | — |
| 15 | PRONTO | auditoria social Instagram/TikTok criada visualmente | 34 | — |
| 16 | PRONTO | criação, edição visual, validade, cálculo e versionamento persistido | 35 | — |
| 17–24 | PRONTO | central visual: edição, revisão, aprovação, envio mock, respostas, follow-up, bounce e histórico persistente | af73174 / 27 / 32 | — |
| 25 | PRONTO | timeline persistida | e22997b | — |
| 26–31 | PRONTO | pedido, checkout (`open/completed/abandoned/expired`), pagamento (`approved/declined/cancelled/refunded`), handoff com retry e comissão mocks visuais/persistentes | 36 / 37 / 9a8b980 | — |
| 32–33 | BLOQUEIO EXTERNO COMPROVADO | minuta HTML, download DOCX, estados e timeline locais completos | e0fc1e0 / 33 | QA raster do DOCX bloqueado: runtime fornecido não contém `soffice.exe` |
| 34–35 | PRONTO | Kanban e follow-up CRM | Prospector | — |
| 36–37 | PRONTO | financeiro persistido | e22997b | — |
| 38 | PRONTO | `.env.example`, bloqueio e varredura | 25 / 26909c9 | — |
| 39–40 | PRONTO | DEMO/reset testados | 18 / e22997b | — |
| 41–42 | PRONTO | 10 Python + MCP + 10 JS | 23 / c7a0938 | — |
| 43–44 | PRONTO | E2Es visuais Datta360, DattaVPS e negativo, com persistência reiniciada e estados finais conferidos | 24 / 32–40 / df28f50 | — |
| 45 | PRONTO | reinício SQLite com entidades do E2E visual confirmadas por endpoints | 22 / 39 | — |
| 46 | PRONTO | seis larguras capturadas em navegador local; painéis, modal, tabelas/Kanban e comparador auditados; correção móvel aplicada | 27 / 41 | — |
| 47–48 | PRONTO | README, evidências e playbook | c85105f | — |
