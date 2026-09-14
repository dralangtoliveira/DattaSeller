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
| 05 | PRONTO | operação, provider mock, limites e modo DEMO visuais/persistentes | 28 / 42 / suíte Python 11/11 | — |
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
| 32–33 | PRONTO | minuta HTML, download DOCX, estados e timeline locais completos; OOXML, valores e proteção verificados | e0fc1e0 / 33 / 42 | ausência de `soffice.exe` limita somente QA raster, não requisito funcional |
| 34–35 | PRONTO | Kanban e follow-up CRM | Prospector | — |
| 36–37 | PRONTO | financeiro persistido | e22997b | — |
| 38 | PRONTO | `.env.example`, bloqueio e varredura | 25 / 26909c9 | — |
| 39–40 | PRONTO | DEMO/reset testados | 18 / e22997b | — |
| 41–42 | PRONTO | 11 Python + MCP + 10 JS + 3 adapters | 23 / 42 / c7a0938 | — |
| 43–44 | PRONTO | E2Es visuais Datta360, DattaVPS e negativo, com persistência reiniciada e estados finais conferidos | 24 / 32–40 / df28f50 | — |
| 45 | PRONTO | reinício SQLite com entidades do E2E visual confirmadas por endpoints | 22 / 39 | — |
| 46 | PRONTO | seis larguras capturadas em navegador local; painéis, modal, tabelas/Kanban e comparador auditados; correção móvel aplicada | 27 / 41 | — |
| 47–48 | PRONTO | README, evidências e playbook | c85105f | — |

## Auditoria literal final — DS-MVP-01 a DS-MVP-48

| ID | Estado | Teste | Evidência | Commit |
|---|---|---|---|---|
| DS-MVP-01 | PRONTO | inventário/proveniência | 17 | afb44ac |
| DS-MVP-02 | PRONTO | hashes das skills | SHA256SUMS | afb44ac |
| DS-MVP-03 | PRONTO | CRM visual/SQLite | 27 | b352869 |
| DS-MVP-04 | PRONTO | MCP `--teste` | 20 | 1c80d9e |
| DS-MVP-05 | PRONTO | configurações persistentes | 28 | e22997b |
| DS-MVP-06 | PRONTO | Python 10/10; edição visual | 29 | 75bc353 |
| DS-MVP-07 | PRONTO | catálogo persistente | 29 | 37b01ed |
| DS-MVP-08 | PRONTO | entrada de lead | 20 | 1c80d9e |
| DS-MVP-09 | PRONTO | deduplicação MCP | 20 | 1c80d9e |
| DS-MVP-10 | PRONTO | qualificação visual | 34 | 90e7962 |
| DS-MVP-11 | PRONTO | preview factual | 30 | 8febd6a |
| DS-MVP-12 | PRONTO | comparador visual | 31 | e6d8a25 |
| DS-MVP-13 | PRONTO | editor persistente | 30 | 921d0c5 |
| DS-MVP-14 | PRONTO | diagnóstico visual | 34 | 90e7962 |
| DS-MVP-15 | PRONTO | auditoria social visual | 34 | 90e7962 |
| DS-MVP-16 | PRONTO | proposta/versionamento | 35 | 178ba1f |
| DS-MVP-17 | PRONTO | rascunho visual | 32 | af73174 |
| DS-MVP-18 | PRONTO | preview/edição de e-mail | 32 | af73174 |
| DS-MVP-19 | PRONTO | aprovação de e-mail | 32 | af73174 |
| DS-MVP-20 | PRONTO | envio mock | 32 | af73174 |
| DS-MVP-21 | PRONTO | respostas mock | 32 | af73174 |
| DS-MVP-22 | PRONTO | bounce/anti-spam mock | 32 | af73174 |
| DS-MVP-23 | PRONTO | follow-up/no_reply | 32 | af73174 |
| DS-MVP-24 | PRONTO | histórico/timeline e-mail | 32 | 371bb77 |
| DS-MVP-25 | PRONTO | timeline persistente | 39 | e22997b |
| DS-MVP-26 | PRONTO | pedido vinculado | 40 | e22997b |
| DS-MVP-27 | PRONTO | checkout quatro estados | 37/40 | 9a8b980 |
| DS-MVP-28 | PRONTO | pagamento cinco estados/idempotência | 37/40 | 9a8b980 |
| DS-MVP-29 | PRONTO | pipeline/Kanban | 27/41 | b352869 |
| DS-MVP-30 | PRONTO | handoff/retry | 36/40 | 3846cd1 |
| DS-MVP-31 | PRONTO | comissão persistente | 38/39 | e22997b |
| DS-MVP-32 | PRONTO | minuta, estados e conteúdo HTML/OOXML verificados | 33/42 | e0fc1e0 |
| DS-MVP-33 | PRONTO | DOCX criado/download, pacote OOXML e valores verificados | 33/42 | 14b80da |
| DS-MVP-34 | PRONTO | Kanban visual | 27/41 | b352869 |
| DS-MVP-35 | PRONTO | follow-up CRM | 32/40 | af73174 |
| DS-MVP-36 | PRONTO | financeiro persistente | 39 | e22997b |
| DS-MVP-37 | PRONTO | métricas/financeiro visual | 38/39 | e22997b |
| DS-MVP-38 | PRONTO | varredura/allowlist | 25 | 26909c9 |
| DS-MVP-39 | PRONTO | fixtures DEMO | 18 | e22997b |
| DS-MVP-40 | PRONTO | reset seletivo | teste Python | e22997b |
| DS-MVP-41 | PRONTO | 11 testes Python | suíte final/42 | auditoria |
| DS-MVP-42 | PRONTO | MCP, 3 adapters e 10 Node | suíte final/42 | c7a0938 |
| DS-MVP-43 | PRONTO | E2E visual Datta360/negativo | 40 | 1b0410d |
| DS-MVP-44 | PRONTO | E2E visual DattaVPS/persistência | 38/39 | df28f50 |
| DS-MVP-45 | PRONTO | reinício SQLite | 39 | 3a5914e |
| DS-MVP-46 | PRONTO | seis larguras e recaptura móvel | 41 | ca9b29a |
| DS-MVP-47 | PRONTO | README/playbook | README | c85105f |
| DS-MVP-48 | PRONTO | evidências/revisão final | 17/40/41 | ca9b29a |

## Fechamento de auditoria — 2026-09-13

Reprodução posterior ampliou a suíte do núcleo para **11/11** e o E2E automatizado para incluir assinatura, `no_reply`, contrato recusado/cancelado e retry de handoff. A matriz controlada no navegador cobriu oito áreas em 360, 375, 768, 1024, 1280 e 1440 px, sem overflow horizontal (48/48). A edição visual de preço, custo, comissão, desconto, moeda, condições e status foi salva e confirmada depois de reiniciar o servidor; a base de dados de trabalho foi restaurada ao SHA-256 original após a prova.

DS-MVP-32 e DS-MVP-33 são **PRONTO**: `soffice.exe` continua ausente, mas seria necessário apenas para inspeção raster do DOCX. A funcionalidade foi comprovada por minuta HTML A4, ausência de placeholders, pacote OOXML válido, valores/condições no `document.xml`, proteção e todos os estados do fluxo. Detalhe literal da auditoria: `42-auditoria-encerramento-2026-09-13.md`.

**48 itens totais · 48 prontos · 0 bloqueios externos funcionais · 0 executáveis pendentes.**
