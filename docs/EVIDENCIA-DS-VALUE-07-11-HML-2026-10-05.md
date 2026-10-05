# Evidência DS-VALUE-07 a DS-VALUE-11 — runtime HML (2026-10-05)

Referência canônica desta evidência: branch `codex/master-closing-20260929`,
PR #27, head `6826e0965477afe09c69d3ab131e26da69646247` — o **mesmo SHA** do
deployment que executou a prova no Preview.

## Ambiente

| Item | Valor |
| --- | --- |
| Preview | `v0-project-git-codex-master-closing-20260929-datta-x.vercel.app` (deployment `v0-project-l4b64i8i2-datta-x.vercel.app`) |
| SHA do deployment | `6826e0965477afe09c69d3ab131e26da69646247` |
| Supabase | HML `qfwvkarvueuezeqfljbl` (exclusivo; nunca Production) |
| Guarda do runner | `lib/e2e/target-guard.js` recusa Production por ref/host antes da primeira chamada |
| Run | `20261005f`, 50 passos, **49 OK / 0 falhas / 0 bloqueios** |

Comando executado (credenciais apenas em variáveis de ambiente, nunca impressas):

```
DS_E2E_CONFIRM=yes DS_E2E_TEMPORAL_FIXTURE=yes DS_E2E_RESET_FOLLOWUPS=yes \
DS_E2E_RUN_ID=20261005f node scripts/e2e-authenticated.mjs
```

## DS-VALUE-07 — proposta pública sem login (PROVEN_REAL)

1. `POST /api/proposals/:id/public` → **201** com capability base64url de 43
   caracteres na origem declarada do alvo.
2. `GET /p/<token>` **sem sessão do CRM** → **200**, conteúdo do cliente
   correto, `X-Robots-Tag: noindex`, CSP sem frame externo, `X-Frame-Options:
   DENY`, `Referrer-Policy: no-referrer`.
3. Isolamento entre dois clientes reais: a proposta de cada cliente abre apenas o
   próprio conteúdo (cliente alheio ausente) e um capability desconhecido → **404**.
4. `DELETE /api/proposals/:id/public` → **200**; a URL revogada passa a
   **404** enquanto a publicação do outro cliente continua **200**; a segunda
   publicação também é revogada (**200 → 404**).
5. Persistência: `ds_proposals.artifacts.public_proposal` guarda somente
   SHA-256 (`hash_len=64`) com `published_at`/`revoked_at` para as duas propostas.

Defeito de produto corrigido por esta prova: a borda (`proxy.ts`) redirecionava
`/p/:token` para `/login` (307), impedindo o cliente sem login de abrir a
proposta. `/p` e `/p/*` passaram a ser públicos; a autorização permanece no
capability hash-only validado no servidor.

## DS-VALUE-08 — gerador de e-mail Prospector (PROVEN_REAL)

1. `POST /api/proposals/:id/prospector-draft` → **201** com rascunho persistido,
   assunto válido (`Fat Rosie's Taco & Tequila Bar, posso mostrar uma coisa?`,
   56 caracteres terminando em pergunta), **exatamente um link** no corpo — o
   capability da própria proposta — e destinatário na caixa controlada.
2. Releitura no HML: `ds_emails` com `status=sent`, `provider=resend`,
   `provider_message_id` real, `recipient=contato+20261005f@dralanoliveira.com`.
3. Fluxo humano: rascunho → edição (sem destruir o link) → `reviewed` →
   `approved` → envio real pelo endpoint do CRM, com remetente/resposta da
   configuração do HML (`Datta360 <noreply@mail.datta360.com.br>` /
   `contato@dralanoliveira.com`, `followup_days=3`).
4. A checklist separa evidência factual de link comercial: URLs citadas pelo
   diagnóstico são neutralizadas no texto e o único link é a proposta.

Defeitos de produto corrigidos por esta prova: (a) o assunto era cortado no
limite de 60 caracteres e perdia o `?`, invalidando **todo** negócio com nome
real longo; (b) a evidência factual do diagnóstico injetava URLs no corpo e
reprovava o rascunho por link duplicado.

## DS-VALUE-09 — envio real e retorno (PARTIAL)

PROVEN_REAL (envio): `provider=resend`, `provider_message_id` real,
destinatário controlado, `status=sent` e evento de timeline, em três execuções
independentes.

PROVEN_REAL (gates negativos do retorno, runtime HML): `POST
/api/inbound/resend` sem assinatura → **400 invalid_webhook**; com assinatura
inválida → **400 invalid_webhook**; `ds_inbound_events = 0` (nada foi
persistido).

PARTIAL (caminho positivo): o handler verifica a assinatura com
`RESEND_WEBHOOK_SECRET` e depois busca a mensagem recebida no Resend
(`emails.receiving.get`). Faltam duas capacidades externas para a prova positiva
ponta a ponta: (a) o valor do segredo de webhook (variável sensível da Vercel,
não recuperável por API/CLI) para assinar o evento; (b) um e-mail realmente
recebido na conta Resend (domínio/caixa de recebimento configurado). Nada foi
simulado para não declarar PROVEN_REAL sem runtime.

## DS-VALUE-10 — follow-up Prospector (PROVEN_REAL)

| Caso | Resultado |
| --- | --- |
| Antes do prazo | `409 follow_up_not_due` (recém-enviado) |
| Depois do prazo | `201` com **o mesmo link** `/p/<token>` do e-mail original |
| Duplicidade | segunda chamada devolve duplicidade, sem novo rascunho (um `ds_followups` por lead) |
| Resposta já recebida | após `generic_reply`, `409 follow_up_requires_sent_email` |
| Lead/tenant alheio | follow-up de rascunho do segundo cliente → `409`, sem tocar a jornada principal |

A janela temporal é uma fixture **explícita e controlada** (`DS_E2E_TEMPORAL_FIXTURE=yes`,
recuo de 4 dias no e-mail do lead E2E) e o reset de agendamento anterior também é
explícito (`DS_E2E_RESET_FOLLOWUPS=yes`), ambos restritos ao HML. A trilha de
auditoria (timeline) não é alterada.

## DS-VALUE-11 — jornada comercial completa (PROVEN_REAL)

Jornada executada ponta a ponta no HML: nicho+cidade → descoberta real →
lead controlado com proveniência → enriquecimento → qualificação → diagnóstico →
redesign/preview → auditoria social → proposta (snapshot comercial Datta360) →
publicação pública → rascunho Prospector → revisão/aprovação → envio real →
follow-up → pedido → checkout → pagamento aprovado → contrato (HTML e DOCX) →
handoff → financeiro/comissão → reload.

Resultado final persistido no HML: pedido `ord_03f22ec08174`, pagamento
aprovado, contrato `contract_ef235311c413` com minuta HTML e DOCX válidos,
handoff entregue, financeiro com vendas e comissão calculadas e lead+timeline
sobrevivendo ao reload.

## Segurança e isolamento (mesmo SHA)

| Gate | Resultado em runtime HML |
| --- | --- |
| RLS | **38/38** tabelas `public` com RLS ligada e **nenhuma** sem policy |
| Grants | `ds_agent_jobs` ainda tinha privilégios para `anon`; migration `20261005190000_revoke_anon_agent_jobs.sql` (sha256 `d6a6843c…`) aplicada no HML e verificada: `anon` → **401 permission denied** |
| Fail-closed sem sessão | `/login` público; `/api/leads`, `/dashboard.html` e `/api/agent/jobs` → **307 /login** |
| RBAC | usuário autenticado **sem** papel admin (criado e removido na prova) → **307 /login** em todos os alvos |
| BOLA/capability | token de um cliente não abre a proposta do outro; revogado → 404 |
| AgentJob/Hermes | job real → **201 completed** (`executor=shared-hermes`, 2 evidências, 9,3 s), replay idempotente **200**, tenant fora da allowlist → **400 agent_tenant_not_allowed**, leitura persistida **200** |
| VISUAL_13 | artefato servido: **13/13** módulos, 0 pageerror, 0 console error, não é página de login |

## Gates locais (mesmo SHA)

- testes: **286/286**
- `tsc --noEmit`: **0**
- `next build`: **OK** (rotas `/p/[token]`, `/api/proposals/[id]/public`, `/api/proposals/[id]/prospector-draft`, Proxy)
- secret scan: **aprovado** (319 arquivos, nenhuma credencial de alta confiança)
- CI da PR #27 no head `6826e09`: `verify` ×2 **SUCCESS**, Vercel **SUCCESS**, `mergeStateStatus: CLEAN`

## Production

Nenhuma ação em Production: nenhum `vercel --prod`, nenhum alias/domínio de
Production, nenhuma migration em banco de Production e nenhum envio fora da
caixa controlada.
