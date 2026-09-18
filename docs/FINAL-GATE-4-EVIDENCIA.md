# Final Gate n. 4 — documento de evidência

Documento de preenchimento objetivo. Ele existe para que a execução do E2E
autenticado, hoje bloqueada por acesso à Vercel e por credenciais, seja
registrada sem interpretação posterior. Nada aqui foi presumido: onde o dado
depende de acesso, o campo está marcado como **PENDENTE**.

Estado em 2026-09-18: **não executado**. Alvo de Production **não confirmado**.
`MERGE_AUTHORIZED: NO`, `PRODUCTION_AUTHORIZED: NO`.

## A. TARGET

| Campo | Valor |
| --- | --- |
| environment | **PENDENTE** — preferência declarada: Preview isolado; Production só com autorização |
| URL alvo | **PENDENTE** (vem de `DS_E2E_BASE_URL`) |
| Vercel Project ID | **PENDENTE** (link local sugere `prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM` / `v0-project`, mas o link não é prova do que serve o domínio) |
| scope/team | **PENDENTE** (link local sugere `team_4LMpNJbFqbxdJk09FLoNpimg`, não verificado via API) |
| deployment ID | **PENDENTE** |
| commit SHA servido | **PENDENTE** |
| branch | **PENDENTE** |
| Vercel Authentication/SSO no Preview | **PENDENTE** — há indício anterior de `302` para `vercel.com/sso-api` |
| timestamp da execução | **PENDENTE** |

## B. CONFIGURAÇÃO (somente nomes e estado)

Preencher `present`/`missing` **sem copiar valor**. Nunca registrar o conteúdo.

| Variável | Exigida por | Estado |
| --- | --- | --- |
| `DS_E2E_BASE_URL` | runner E2E | PENDENTE |
| `DS_E2E_EMAIL` | runner E2E (login admin) | PENDENTE |
| `DS_E2E_PASSWORD` | runner E2E (login admin) | PENDENTE |
| `DS_E2E_EMAIL_TO` | runner E2E (destinatário controlado) | PENDENTE |
| `DS_E2E_CONFIRM` | runner E2E (precisa ser `yes`) | PENDENTE |
| `NEXT_PUBLIC_SUPABASE_URL` | runner E2E (cliente Supabase) | PENDENTE |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | runner E2E (cliente Supabase) | PENDENTE |
| `SUPABASE_SECRET_KEY` | cleanup do E2E (`scripts/e2e-cleanup.mjs`) | PENDENTE |
| `RESEND_API_KEY` | envio real pelo endpoint do CRM | PENDENTE |
| `DATTA360_WEBHOOK_SECRET` | webhook de handoff `POST /api/inbound/datta360` | PENDENTE |

## C. E2E — um bloco por passo do plano canônico

Os 27 passos e a ordem estão em `lib/e2e/plan.js`. Preencher uma linha por passo
com: **step id · operação · OK/FALHA/BLOCKED/SKIP · recurso criado · id mascarado ·
evidência · duração · cleanup status**.

| step id | operação | resultado | recurso criado | id mascarado | evidência | duração | cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- |
| auth | `GET /api/leads` | PENDENTE | — | — | — | — | — |
| prospect | `POST /api/prospects` | PENDENTE | lead `e2e-<runId>` | — | — | — | `npm run e2e-cleanup -- --run-id=<runId>` |
| dedup | `POST /api/prospects` (mesma fonte) | PENDENTE | — | — | — | — | — |
| qualification | `POST /api/qualifications` | PENDENTE | qualificação | — | — | — | sim (run-scoped) |
| diagnosis | `POST /api/diagnoses` | PENDENTE | diagnóstico | — | — | — | sim |
| social | `POST /api/social-audits` | PENDENTE | auditoria social | — | — | — | sim |
| preview | `POST /api/previews` | PENDENTE | preview | — | — | — | sim |
| editor | `GET /api/previews/:id/editor` | PENDENTE | — | — | — | — | — |
| comparator | `GET /api/comparators/:slug` | PENDENTE | — | — | — | — | — |
| proposal | `POST /api/proposals` | PENDENTE | proposta | — | — | — | sim |
| negotiation | `PUT /api/proposals/:id` | PENDENTE | — | — | — | — | — |
| cover | `GET /api/proposals/:id/cover` | PENDENTE | — | — | — | — | — |
| email_draft | `POST /api/emails` | PENDENTE | e-mail | — | — | — | sim |
| email_edit | `PUT /api/emails/:id` | PENDENTE | — | — | — | — | — |
| email_approve | `POST /api/emails/:id/transition` | PENDENTE | — | — | — | — | — |
| email_send | `POST /api/emails/:id/transition` | PENDENTE | transição de status | — | — | — | sim |
| email_followup | `POST /api/emails/:id/follow-up` | PENDENTE | follow-up | — | — | — | sim |
| email_timeline | `GET /api/timeline` | PENDENTE | — | — | — | — | auditoria preservada |
| order | `POST /api/orders` | PENDENTE | pedido | — | — | — | sim, se não pago |
| checkout | `POST /api/orders/:id/checkout` | PENDENTE | checkout | — | — | — | sim, se não pago |
| payment | `POST /api/orders/:id/payment` | PENDENTE | pagamento | — | — | — | **não** se pago/approved |
| contract | `POST /api/orders/:id/contract` | PENDENTE | contrato | — | — | — | sim, se não pago |
| contract_html | `GET /api/contracts/:id/html` | PENDENTE | — | — | — | — | — |
| contract_docx | `GET /api/contracts/:id/docx` | PENDENTE | — | — | — | — | — |
| handoff | `POST /api/orders/:id/handoff` | PENDENTE | handoff | — | — | — | sim, se não pago |
| financial | `GET /api/financial` | PENDENTE | — | — | — | — | — |
| reload | `GET /api/leads` + `GET /api/timeline` | PENDENTE | — | — | — | — | — |

## D. E-MAIL REAL

O passo `email_send` do runner usa `sent_simulated` e portanto **não prova envio
real**. Para registrar a prova real, este bloco precisa de execução com o
provider ativo no ambiente alvo.

| Campo | Valor |
| --- | --- |
| aprovação humana feita antes do envio | PENDENTE (o endpoint exige `status = approved`, senão 409) |
| chamada pelo endpoint do CRM (`/api/email-send`) | PENDENTE |
| status final = `sent` | PENDENTE |
| `provider_message_id` presente | PENDENTE |
| remetente | PENDENTE |
| destinatário controlado | PENDENTE (nunca um lead real) |
| nenhum secret registrado na evidência | PENDENTE (conferir antes de anexar) |

## E. PERSISTÊNCIA — o que fica no banco

Preencher com o que **realmente** permaneceu após o run, por recurso:

| Recurso | O que fica | Cleanup |
| --- | --- | --- |
| lead `e2e-<runId>` | PENDENTE | removido por `--cleanup --confirm=<runId>` |
| prospecção/enrichment (`ds_qualifications`, `ds_lead_events`) | PENDENTE | removido (run-scoped) |
| diagnóstico, auditoria social, preview | PENDENTE | removido (run-scoped) |
| proposta | PENDENTE | removido (run-scoped) |
| e-mail e follow-up | PENDENTE | removido (run-scoped) |
| pedido, checkout, pagamento, contrato, handoff, comissão | PENDENTE | removido **se não houver pagamento pago/approved**; caso contrário preservado e reportado |
| timeline/auditoria (`ds_timeline`) | PENDENTE | **preservada por padrão**; sai só com `--purge-audit` |

## Cleanup — como usar

```bash
# dry-run (padrão): mostra o que sairia, sem tocar em nada
node scripts/e2e-cleanup.mjs --run-id=<runId>

# execução explícita (exige confirmação idêntica ao run id)
node scripts/e2e-cleanup.mjs --run-id=<runId> --cleanup --confirm=<runId>

# incluir a trilha de auditoria do run (só quando o modelo permitir)
node scripts/e2e-cleanup.mjs --run-id=<runId> --cleanup --confirm=<runId> --purge-audit
```

Garantias implementadas e testadas: escopo por `lead.e2e-<runId>`; recusa de
run-id inválido; mutação só com `--cleanup --confirm=<runId>`; idempotência;
pedido com pagamento `paid/approved` é preservado junto dos filhos; outro lead,
outro run, outro seller e dado de Production não marcado como E2E ficam
intocados; auditoria preservada por padrão; resumo sanitizado com id mascarado e
sem valores; sem credencial de servidor o script sai com `missing_credentials`
informando apenas os nomes das variáveis.
