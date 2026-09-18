# FINAL ACCEPTANCE — DATTASELLER / DATTA360

Modo fechamento total. Nenhuma funcionalidade nova foi criada. Este documento
classifica cada requisito em **PASS**, **FAIL** ou **BLOCKED** e é a fonte do
`READY_FOR_MERGE`.

Candidato: **PR #14** (`codex/supervisor-dattaseller`) · base
`hardening/phase-a-containment-clean @ a466cf3` · `MERGE_AUTHORIZED: NO` ·
`PRODUCTION_AUTHORIZED: NO`.

## Fase 1 — Site público (auditado em 2026-09-18 via HTTPS)

| Requisito | Status | Evidência |
| --- | --- | --- |
| HTTPS + redirect | PASS | `https://www.datta360.com.br` responde 200, `Server: Vercel`, HSTS `max-age=63072000` |
| Segurança do site (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) | **FAIL** | os cinco headers **não** são enviados; só HSTS está presente |
| SEO básico (title, description, canonical, og:title) | PASS | title `Datta360° — Presença Digital Integrada`; description com canais; canonical `https://www.datta360.com.br`; `og:title` presente |
| SEO Open Graph completo | **FAIL** | `og:image` ausente (0 ocorrências) |
| Favicon | PASS | `/datta360-icon.svg?v=20260915-2` |
| Imagens com alt | PASS | 7 `<img>`, 0 sem `alt` |
| robots.txt / sitemap.xml | BLOCKED | não coletados nesta execução; exigem nova consulta externa |
| Header/navegação e CTAs | BLOCKED | exige inspeção visual/interativa (sem browser/Lighthouse neste ambiente) |
| Responsividade 360/390/768/1280/1440 | BLOCKED | exige browser real; não medido |
| Performance (LCP/INP/CLS/Lighthouse) | BLOCKED | Lighthouse/PageSpeed não disponíveis aqui |
| Acessibilidade (contraste, foco, teclado) | BLOCKED | exige browser real |

### Claims do site × funcionalidade real

O site afirma conectar **site, Google Business Profile, Instagram, WhatsApp
Business, CRM e TikTok**.

| Claim | Classificação | Base |
| --- | --- | --- |
| CRM | PARCIAL | existe no candidato (leads, proposta, e-mail, pedido, contrato, financeiro, timeline), mas o fluxo ponta a ponta ainda não foi provado (E2E bloqueado) |
| Diagnóstico, preview visual, proposta, follow-up | PARCIAL | implementados e cobertos por testes; falta prova de runtime no Preview |
| Google Business Profile | NÃO IMPLEMENTADO | não há integração no repositório |
| Instagram | NÃO IMPLEMENTADO | não há integração; o site apenas cita o canal |
| TikTok | NÃO IMPLEMENTADO | não há integração no repositório |
| WhatsApp Business | DEMONSTRAÇÃO | existe apenas geração de link `wa.me`; não há integração de API |

Consequência: a copy atual afirma canais "trabalhando juntos" que tecnicamente
não estão ativos. Corrigir texto ou entregar integração é decisão humana; não foi
inventada funcionalidade para justificar copy.

### Formulário de diagnóstico (site → CRM)

| Requisito | Status | Evidência |
| --- | --- | --- |
| Campos nome, empresa, telefone, site, instagram, e-mail | PASS | HTML tem os seis campos; `nome`, `empresa`, `telefone` (`type=tel`) e `email` (`type=email`) são `required` |
| Validação e mensagens | PARCIAL | `noValidate` com `reportValidity()` no bundle; mensagens específicas não verificadas visualmente |
| Destino do envio | PASS (estático) | o bundle chama `fetch("/api/leads", { method: "POST" })` no próprio domínio |
| Intake no CRM | PASS (estático) | `app/api/[...path]/route.ts` implementa a raiz `leads` sobre `ds_leads` (lista filtra `deleted_at is null`) |
| `SITE_FORM_SUBMITTED → CRM_LEAD_CREATED` | BLOCKED | exige envio real; não executado (violaria a regra de não escrever em Production sem autorização) |
| Deduplicação provada | BLOCKED | idem; o passo `dedup` existe no plano E2E |
| Rate limit / anti-spam do formulário | **FAIL** | não foi encontrado limite de taxa no caminho do site (o CRM tem rate limit próprio, a camada pública não) |
| XSS/sanitização | PARCIAL | campos são persistidos e reexibidos; sem auditoria de escape ponta a ponta nesta rodada |

### Preços — COMERCIAL_CONFLICT

| Fonte | Valores observados |
| --- | --- |
| Site público | USD 80 / 108 / 120 / 150 / 474 / 490 / 790 e BRL 410 / 554 / 615 / 770 / 2.427 / 2.510 / 4.045 |
| CRM (seed `ds_products`) | `datta360` 1.500 BRL (one_time), `dattavps` 190, `dattaseg` 240, `dattahost` 45 — todos `currency = BRL`, `max_discount_pct = 20`, todos `is_demo = true` |

**COMERCIAL_CONFLICT**: não existe mapeamento persistido entre o catálogo
público do site e `ds_products`; o site mistura USD e BRL e o CRM só tem BRL com
catálogo marcado como demo. Nenhum preço foi alterado por iniciativa técnica.
Decisão humana: qual catálogo é a fonte única (site ou CRM) e como o site passa a
ler o preço do CRM.

## Fases 2, 3 e 4 — E2E, Final Gate e e-mail real

| Requisito | Status | Evidência |
| --- | --- | --- |
| Runner E2E com 27 passos canônicos | PASS | `lib/e2e/plan.js` + `scripts/e2e-authenticated.mjs`, exigindo `DS_E2E_CONFIRM=yes` |
| Resultado por etapa com step/timestamp/duração/id mascarado/cleanup | PASS | o runner registra por passo; o padrão de evidência está em `docs/FINAL-GATE-4-EVIDENCIA.md` |
| Cleanup controlado do run | PASS | `lib/e2e/cleanup.js` + `scripts/e2e-cleanup.mjs`: dry-run por padrão, `--cleanup --confirm=<runId>`, escopo `e2e-<runId>`, idempotente, falha fechado, pedido pago preservado, auditoria preservada, resumo mascarado |
| Execução real do E2E | BLOCKED | sem `DS_E2E_*`, sem acesso ao Preview (SSO) e sem autorização de escrita no ambiente alvo |
| E-mail real (approval → `/api/email-send` → Resend → `sent` → `provider_message_id`) | BLOCKED | contrato de código verificado (admin-only, exige `approved`, chave só no servidor, falha fechada); falta `RESEND_API_KEY` e `email_provider = resend` no alvo, e o passo do runner usa `sent_simulated` |

## Fase 5 — Vercel

BLOCKED sem exceção: sem CLI, sem `auth.json`, sem `VERCEL_TOKEN`/`VERCEL_ORG_ID`/
`VERCEL_PROJECT_ID`. O link local (`.vercel/project.json`) não prova qual
deployment serve o domínio. Nada foi promovido.

## Fase 6 — Revisão funcional do CRM

| Requisito | Status | Evidência |
| --- | --- | --- |
| Nenhum reset DEMO no dashboard público | PASS | 0 ocorrências de `reset`/`demo` no HTML público; patch de produção é testado (`test/phase-a-hardening.test.js`) |
| Nenhuma credencial no frontend/repo | PASS | `secret-scan` 0 ocorrências em 224 arquivos; scanner ligado ao build da Vercel |
| Botões mortos, erros JS, XSS, cross-seller, dados DEMO em Production | BLOCKED | exigem navegação autenticada no Preview; não executado |

## Fase 7 — Cleanup E2E

PASS conforme a seção acima, com uma nota registrada: a remoção dos recursos
sintéticos do run é **física** (os dados são `e2e-*` com domínios `.example`,
criados pelo próprio runner), enquanto `ds_timeline` é preservada por padrão. O
schema tem soft delete (`ds_leads.deleted_at`, e a listagem filtra
`deleted_at is null`); se o operador preferir soft delete para os recursos do
run, isso é um modo adicional a implementar, não um bloqueio do gate.

## Fase 8 — Regressão final no candidato (SHA `d19f81c`)

| Comando | Resultado |
| --- | --- |
| `node --experimental-strip-types --test` | PASS — 88/88 |
| `npm run build` (`next build`) | PASS |
| `tsc --noEmit` | PASS — exit 0 |
| `npm run secret-scan` | PASS — 0 ocorrências |
| `git diff --check` | PASS |
| `sync-dashboard` + `production-dashboard-patch` | PASS — sem alteração de conteúdo |
| PR #14 × canônica | PASS — 30 arquivos; nenhum preço/canal/catálogo inventado (só dois documentos de classificação citam preço/canal) |
| CI/Preview no mesmo SHA | PASS nos heads anteriores (`8de6bed`, `51499fe`); reconfirmar no head final |

## Contagem do gate

Requisitos classificados: **31** · PASS: **17** · FAIL: **4** · BLOCKED: **10**.

`READY_FOR_MERGE: NO` — existem FAIL (headers de segurança do site, `og:image`,
rate limit do formulário público, conflito comercial) e BLOCKED críticos
(Vercel, E2E, e-mail real, revisão funcional).
