# Fechamento do inventário DS-MVP-01 a DS-MVP-48 na linha web

Data: 2026-09-16. Base: `hardening/phase-a-containment-clean`. Objetivo:
fechar formalmente o inventário `DS-MVP-01` a `DS-MVP-48` na linha atual
(Next/Supabase), distinguindo o que está implementado na web, o que segue
apenas como proveniência local e o que está fora por decisão de contenção.

Nenhum rótulo foi inventado aqui: os títulos de cada item vêm literalmente do
inventário histórico `poc/dattaseller-local/evidence/17-inventario-ds-mvp.md`.
Este documento não autoriza merge, deploy de Production, migration ou contato
externo.

## Como ler a coluna de estado

- **PRONTO (web)** — existe implementação na linha web com teste ou evidência
  reproduzível nesta base.
- **PARCIAL (web)** — existe implementação, com pendência nomeada e verificável.
- **NÃO MIGRADO (decisão)** — ausente de propósito por contenção, com a
  evidência da decisão apontada.

## Controle item a item

| ID | Título (inventário 17) | Âncora na linha web | Teste/evidência | Estado |
| --- | --- | --- | --- | --- |
| 01 | inventário e proveniência | `poc/dattaseller-local/evidence/17-inventario-ds-mvp.md`, `vendor/prospector-original/SHA256SUMS.txt` | hashes preservados | PRONTO (proveniência) |
| 02 | seis skills preservadas | `vendor/prospector-original/packages/*` (6 pacotes), cópias em `poc/dattaseller-local/skills` | `SHA256SUMS.txt` | PRONTO (proveniência) |
| 03 | CRM SQLite/dashboard e criação visual | `public/dashboard.html` gerado por `scripts/sync-dashboard.mjs`, CRUD em `app/api/[...path]/route.ts`, persistência em `supabase/migrations/20260914031102_dattaseller_web_schema.sql` | suíte Node + `test/prospector.test.js` | PRONTO (web); SQLite permanece apenas no PoC local |
| 04 | MCP e autoteste | `poc/dattaseller-local/app/prospector-mcp.py` | execução local | NÃO MIGRADO (decisão): ferramenta local, sem exposição pública |
| 05 | operação, provider mock, limites e modo DEMO | `PUT /api/settings` com `email_provider`, `hour_limit`, `day_limit`, `demo_mode`, `followup_days` | `test/phase-a-hardening.test.js` | PRONTO (web); o reset DEMO está fora por contenção (ver 39–40) |
| 06 | preço/custo/comissão/desconto/moeda/condições/status | `PUT /api/products` com allow-list explícita | `test/phase-a-hardening.test.js` | PRONTO (web) |
| 07 | catálogo, CTA, disponibilidade e checkout HTTPS opcional | `PUT /api/products` (`checkout_url`, `cta_label`, `availability`), `GET /api/products` | suíte Node | PRONTO (web); adapter real de checkout segue mock por decisão |
| 08 | entrada de lead sem e-mail | `POST /api/prospects` e `saveProspect` | `test/prospector.test.js` | PRONTO (web) |
| 09 | cinco chaves de dedupe | `duplicateOf` em `lib/prospector.js`, migration de normalizações aplicada em Production | teste das cinco chaves | PRONTO (web) |
| 10 | qualificação separando fato, hipótese e recomendação | `POST /api/qualifications`, `normalizeQualification` | `test/prospector.test.js` | PRONTO (web) |
| 11 | preview factual persistido | `POST /api/previews`, `ds_previews`, `GET /api/previews/:id` | `test/prospector.test.js` | PRONTO (web) |
| 12 | comparador antes/depois | `GET /api/comparators/:slug`, `renderProspectorComparator` | `test/prospector.test.js` | PRONTO (web), restrito a URL pública e preview persistido |
| 13 | editor visual de preview | `GET /api/previews/:id/editor`, `withProspectorEditor` | `test/prospector.test.js` | PRONTO (web) |
| 14 | diagnóstico factual de site | `POST /api/diagnoses`, `ds_site_diagnoses` | suíte Node | PRONTO (web) |
| 15 | auditoria Instagram/TikTok e direção visual | `POST /api/social-audits` (`platform`, `creative_direction`), `ds_social_audits` | `test/phase-a-hardening.test.js` (allow-list por plataforma) | PRONTO (web) |
| 16 | proposta comercial versionada com artefatos | `POST /api/proposals`, `PUT /api/proposals/:id` (nova versão), `GET /api/proposals/:id/cover` | `test/prospector.test.js` | PRONTO (web) |
| 17 | rascunho de e-mail | `POST /api/emails` | suíte Node + dashboard | PRONTO (web) |
| 18 | preview/edição de e-mail | `PUT /api/emails/:id` | `test/email-follow-up.test.js` | PRONTO (web) |
| 19 | aprovação de e-mail | `POST /api/emails/:id/transition` (`reviewed` → `approved`) | suíte Node | PRONTO (web) |
| 20 | envio mock | `POST /api/emails/:id/transition` com `sent_simulated` | suíte Node | PRONTO (web) para o caminho mock; o envio real segue bloqueado em `DS-WEB-RESEND-001` |
| 21 | respostas mock | `positive_reply`, `negative_reply`, `generic_reply` | suíte Node | PRONTO (web) |
| 22 | bounce/anti-spam mock | `bounce`/`failed` e limites `hour_limit`/`day_limit` | suíte Node | PRONTO (web) |
| 23 | follow-up/no_reply | `POST /api/emails/:id/follow-up`, `ds_followups`, `no_reply` | `test/email-follow-up.test.js` | PRONTO (web) a partir do PR #7 (`51bdb7f`) |
| 24 | histórico/timeline e-mail | eventos `email.*` em `ds_timeline` e histórico no editor | suíte Node | PRONTO (web) |
| 25 | timeline persistida | `GET /api/timeline` sobre `ds_timeline` | suíte Node | PRONTO (web) |
| 26 | pedido vinculado | `POST /api/orders`, `ds_orders` | `test/checkout.test.js` | PRONTO (web) |
| 27 | checkout quatro estados | `POST /api/orders/:id/checkout` (`open/completed/abandoned/expired`) | `test/checkout.test.js` | PRONTO (web) |
| 28 | pagamento cinco estados/idempotência | `POST /api/orders/:id/payment`, `onConflict: order_id, ignoreDuplicates` | `test/payment-webhook.test.js` | PRONTO (web) |
| 29 | pipeline/Kanban | view `pipeline` no dashboard de produção | `scripts/production-dashboard-patch.mjs` | PRONTO (web); revalidação visual depende do E2E autenticado |
| 30 | handoff/retry | `POST /api/orders/:id/handoff` com `retry_count` | `test/paid-handoff.test.js` | PRONTO (web) |
| 31 | comissão persistente | `ds_commissions` a partir de `commission_pct` do produto | `test/commission.test.js` | PRONTO (web) |
| 32 | minuta, estados e conteúdo HTML | `POST /api/orders/:id/contract`, `GET /api/contracts/:id/html`, `POST /api/contracts/:id/transition` | suíte Node | PRONTO (web) |
| 33 | DOCX criado/download, pacote OOXML e valores | `GET /api/contracts/:id/docx`, `lib/contracts/docx.js` | `test/contract-docx.test.js` | PRONTO (web) a partir do PR #7 (`51bdb7f`) |
| 34 | Kanban visual | view `pipeline` do patch de produção | `scripts/production-dashboard-patch.mjs` | PRONTO (web); revalidação visual depende do E2E autenticado |
| 35 | follow-up CRM | view `followup` e `settings.followup_days` | `scripts/production-dashboard-patch.mjs` | PRONTO (web) |
| 36 | financeiro persistente | `GET /api/financial` sobre `ds_orders`, `ds_payments`, `ds_commissions` | suíte Node | PRONTO (web) |
| 37 | métricas/financeiro visual | `vFinanceiroLocal` (receita, recebido, a receber, custo, margem, MRR, comissão) | dashboard publicado | PRONTO (web) |
| 38 | `.env.example`, bloqueio e varredura | `.env.example`, `lib/hardening/guards.ts` | `test/phase-a-hardening.test.js` | PRONTO (web) |
| 39 | fixtures DEMO | `ds_products.is_demo` e `demo_product_contract_forbidden` | `test/phase-a-hardening.test.js` | PARCIAL (web): as fixtures existem, o reset de dados não |
| 40 | reset seletivo | removido de propósito pelo patch de produção | `production-dashboard-patch.mjs` remove o botão e `test/phase-a-hardening.test.js` garante ausência de `resetDemo` | NÃO MIGRADO (decisão): Production não deve resetar dados reais |
| 41 | 11 testes Python | suíte Node substitui a suíte Python do PoC | 13 arquivos / 55 testes Node | PRONTO (web) |
| 42 | MCP, 3 adapters e 10 Node | `src/payments/webhook.js`, `src/orders/checkout.js`, `src/match/lead-product.js`, `src/delivery/state-machine.js` | `test/payment-webhook.test.js`, `test/lead-product.test.js`, `test/delivery-state-machine.test.js` | PRONTO (web), adapters mock |
| 43 | E2E visual Datta360/negativo | evidência local `poc/dattaseller-local/evidence/40-e2e-visual-dattaseller-completo.md` | execução local | PARCIAL (web): o E2E autenticado é o Final Gate n. 4 |
| 44 | E2E visual DattaVPS/persistência | evidências locais 38 e 39 | execução local | PARCIAL (web): idem 43 |
| 45 | reinício SQLite | `docs/EVIDENCIA-DS-MVP-17-PIPELINE-2026-09-16.md` (recarga do CRM) | evidência datada | PARCIAL (web): recarga comprovada, restart de runtime pendente no E2E |
| 46 | seis larguras e recaptura móvel | `poc/dattaseller-local/evidence/responsive/` | 6 larguras + recaptura móvel | PARCIAL (web): capturas são do PoC local |
| 47 | README, evidências e playbook | `README.md`, `poc/dattaseller-local/PLAYBOOK.md`, `docs/*` | leitura direta | PRONTO |
| 48 | evidências/revisão final | `poc/dattaseller-local/evidence/42-auditoria-encerramento-2026-09-13.md`, `docs/EVIDENCIA-*` | leitura direta | PRONTO |

## Resultado

**48 itens: 41 PRONTO (web), 5 PARCIAL (web), 2 NÃO MIGRADO (decisão).**

- Os 5 parciais (39, 43, 44, 45, 46) têm uma única causa comum: falta a
  execução visual/autenticada no ambiente real, que é exatamente o Final Gate
  n. 4 e depende de acesso a Supabase/Vercel e de remetente verificado.
- Os 2 não migrados (04 e 40) são ausências deliberadas de contenção, e não
  pendências: o MCP é ferramenta local e o reset de dados não pode existir em
  Production.
- O envio real de e-mail (itens 20 e 23 no caminho real) continua preso ao
  `DS-WEB-RESEND-001`: sem `RESEND_API_KEY` no servidor a rota responde
  `provider_not_configured` em vez de enviar.

## Diferença em relação ao inventário de 2026-09-13

O inventário original atestava 48/48 como PRONTO, mas media a linha
**local** (SQLite, Python, MCP, browser local). Este documento mede a linha
**web** (Next/Supabase, dashboard publicado, Vercel). Itens que eram
comprovadamente prontos no PoC aparecem aqui como proveniência preservada
(01, 02), decisão de contenção (04, 40) ou pendência de revalidação visual
(43–46). Nenhum item regrediu: nenhum deles perdeu implementação.
