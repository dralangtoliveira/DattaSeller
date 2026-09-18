# SUPERVISOR DATTASELLER — checkpoint da automação

Atualizado em 2026-09-17. Este arquivo é o checkpoint operacional do supervisor
autônomo do **DattaSeller** (`dralangtoliveira/DattaSeller`). Ele não substitui o
Registro Canônico (`docs/REC-CANON-001-*`), o `AGENTS.md` nem a documentação
versionada; serve como ponto seguro de retomada.

## Identidade verificada

| Campo | Valor |
| --- | --- |
| Projeto | DattaSeller |
| Repositório / remote | `dralangtoliveira/DattaSeller` (`https://github.com/dralangtoliveira/DattaSeller`) |
| Pasta | `C:\Users\dr_al\OneDrive\Documentos\ChatGPT\DattaSeller` |
| Branch canônica | `hardening/phase-a-containment-clean` |
| HEAD da canônica (auditado) | `a466cf397a85f3a632f5fc82bb9ec9bb12cf60e1` |
| Branch de consolidação | `codex/supervisor-dattaseller` (criada desta auditoria) |
| Registro de escopo | `FOREIGN_CONTEXT_IGNORED` — ver "Isolamento" abaixo |

## Isolamento de escopo

A partir de 2026-09-17, esta conversa, o supervisor e qualquer automação vinculada
tratam **exclusivamente** o DattaSeller. Conteúdo de DattaX, `DXM-*`, `EV-*`,
`investigator_notes`, projeto Supabase `zbwspbzvndkdhjqranwz`, DattaVPS,
DattaSeg, DattaLex, `tributario-rag`, Cubo e outros repositórios Datta está
marcado como `FOREIGN_CONTEXT_IGNORED` e não é executado, commitado nem usado como
justificativa de alteração neste repositório. Entradas anteriores do Registro
Canônico que citam outro projeto permanecem como história; nada nelas autoriza
trabalho aqui.

## Quadro auditado

### Concluído e incorporado na canônica

- PR #5 (reconciliação Prospector), PR #7 (follow-up de e-mail + DOCX de
  contrato), PR #8 (inventário DS-MVP-01 a DS-MVP-48) e PR #9 (contenção do reset
  DEMO): todos mesclados; a canônica está em `a466cf3`.

### PRs abertas na auditoria

| PR | branch | commits à frente da canônica | atrás | conteúdo |
| --- | --- | --- | --- | --- |
| #13 | `codex/vercel-ci-gate` | 2 | 0 | `vercel.json`: gate de `npm test` + build na Vercel |
| #12 | `codex/e2e-final-gate-4` | 1 | 0 | harness E2E autenticado (`lib/e2e/plan.js`, `scripts/e2e-authenticated.mjs`, teste, runbook, `package.json`) |
| #11 | `codex/rec-reconciliacao` | 9 | 0 | docs: REC-GIT-001, REC-UI-001, REC-CANON-001, OPS-360-CHANNELS-001, evidências de deployment/migrations, `.gitignore` |
| #10 | `codex/ops-coupon-001` | 2 | 0 | cupom/teto de preço: `lib/coupons/coupon.js`, `app/api/[...path]/route.ts`, migration, teste, doc |
| #6 | `finalize/crm-proposal-artifacts` | 5 | 6 | artefatos visuais da proposta (capa, rota, lib, teste) **+ 2 commits de CI que já existem no #13** |
| #1 | `codex/mvp-local-ready` | — | — | linha local baseada em `main` (fora da canônica; não reconciliada) |

### Reconciliado nesta auditoria

Duplicação encontrada: os commits `a4260a8` e `1340746` do PR #6 são a origem dos
`ae16332`/`b01a7eb` do PR #13 (`vercel.json`, gate de CI). Integrar os dois
duplicaria a mudança do mesmo arquivo; o PR #13 já é a versão isolada.

Ordem de integração aplicada em `codex/supervisor-dattaseller` (da canônica
`a466cf3`), por risco crescente e sem merge cego:

1. PR #11 completo (docs + `.gitignore`) — sem código de produto;
2. PR #13 completo (`vercel.json`);
3. PR #12 completo (harness E2E);
4. PR #10 completo (cupom + teto de preço);
5. PR #6 **parcial**: `d02bfe4`, `33f5d60`, `1d6fedc` (artefatos/capa/teste),
   descartando os dois commits de CI já cobertos pelo #13.

Todos os 17 cherry-picks aplicaram sem conflito.

## Evidência de validação (branch `codex/supervisor-dattaseller`)

- `node --experimental-strip-types --test`: **73 testes, 73 pass, 0 fail**.
- `tsc --noEmit`: exit 0.
- `next build`: exit 0, com `/api/proposals/[id]/cover` compilada.
- `git diff --check`: limpo (apenas aviso de CRLF no arquivo gerado).
- varredura de segredos nos arquivos do intervalo (`sk-*`, `re_*`, JWT,
  `service_role`, `RESEND_API_KEY`): **0 ocorrências**.
- `scripts/sync-dashboard.mjs` + `scripts/production-dashboard-patch.mjs`
  executados: `public/dashboard.html` não muda de conteúdo (o artefato versionado
  está em sincronia).

## Classificação da linha `codex/mvp-local-ready` (PR #1)

Auditoria de 2026-09-18, somente leitura:

- **Sem ancestral comum com a canônica.** As raízes são diferentes — a linha #1
  vem de `7653686 docs: registrar documentação base do DattaSeller` e a canônica
  de `83bc2cd docs: define DattaSeller MVP contract`. `git merge-base` não existe
  entre elas; `git diff` de três pontos falha com *no merge base*.
- **Tamanhos divergentes:** 105 arquivos na linha #1 contra 199 na canônica.
  Contra `main` a linha está 6 commits à frente e 3 atrás; contra a canônica,
  13 à frente e **120 atrás**.
- **Conteúdo:** o corpo do trabalho é o POC local (`poc/dattaseller-local/**`:
  servidor de dashboard em Python, skills, templates, evidências PNG) e um
  esqueleto de app v0 (`app/`, `components/ui`, `lib/utils`, `next.config.mjs`,
  `pnpm-lock.yaml`). A canônica **já tem** `poc/` com 112 arquivos; o que existe
  apenas na linha #1 são, na prática, `public/placeholder-*`, ícones e o
  `tsconfig.json` do commit `d90844e`.
- **Decisão técnica:** **não integrar**. Um merge exigiria
  `--allow-unrelated-histories` e importaria 105 arquivos, incluindo binários de
  evidência e um segundo esqueleto de aplicação, contra a regra de integrar
  apenas o comprovadamente compatível. A linha permanece **preservada e intocada**.
- **Caminho barato, se algum dia for desejado:** extrair arquivo a arquivo
  (`git checkout <sha> -- <caminho>`) numa branch nova, com revisão humana, em
  vez de mesclar históricos.

## Varredura de segredos versionada

Novo `scripts/secret-scan.mjs` (com `npm run secret-scan`) varre os arquivos
versionados e reprova o processo quando encontra credencial de alta confiança:
chave OpenAI/`sk-*`, chave Resend/`re_*`, token GitHub, JWT, chave privada
PEM, URI Postgres com senha e `SUPABASE_SERVICE_ROLE_KEY`/`RESEND_API_KEY`
preenchidas. Ele **nunca imprime o valor** encontrado — só arquivo, linha e o
nome do padrão — e ignora placeholders de exemplo (`sk-your-...`, `re_test_...`,
`user:password@`). Ligado ao gate de deploy em `vercel.json`
(`npm test && node scripts/secret-scan.mjs && … && next build`), de modo que a
Preview passa a falhar antes de publicar se uma credencial real aparecer.

## Bloqueios humanos (somente credencial, autorização ou decisão)

1. **Vercel Production:** `vercel login` no scope `datta-x` (token só em memória)
   para identificar o deployment que serve `crm.datta360.com.br`.
2. **E2E do Final Gate n. 4:** credenciais administrativas `DS_E2E_*` e decisão
   sobre como contornar a proteção SSO do Preview.
3. **Envio real de e-mail:** `RESEND_API_KEY` no ambiente correto e
   `email_provider = resend` em `ds_settings`.
4. **Promoção:** merge na canônica e promoção para Production exigem autorização
   explícita; a canônica pode ser a branch que publica, então nem mesclar docs é
   neutro.

## Missão Final Gate n. 4 — auditoria dos bloqueios externos (2026-09-18)

Regra vigente: a **PR #14** é a candidata principal de integração; as PRs #6,
#10, #11, #12 e #13 permanecem intactas até a #14 passar todos os gates. Nada
foi mesclado e nenhum deploy de Production foi feito.

### 1. Vercel — não há sessão válida (BLOQUEIO A)

Auditado sem inventar estado:

- `vercel` **não está no PATH** desta máquina;
- `%USERPROFILE%\.vercel\auth.json` **não existe**;
- `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` **não estão no ambiente**.

Único artefato local é o link do projeto em `.vercel/project.json` (arquivo, não
credencial): `projectName: v0-project`, `projectId: prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM`,
`orgId: team_4LMpNJbFqbxdJk09FLoNpimg`. Isso **não** prova qual deployment serve
`crm.datta360.com.br` — a associação de domínio continua **desconhecida** e não
será presumida.

Quando houver acesso válido, coletar nesta ordem: projeto/Project ID e scope
confirmados na API; deployment de Production associado ao domínio; commit SHA
servido; variáveis de ambiente necessárias ao CRM (somente nomes e presença);
se o Preview da #14 exige autenticação Vercel (SSO); e se o runner E2E consegue
atingir esse Preview.

### 2. Final Gate n. 4 — E2E preparado, execução depende de acesso

Variáveis exigidas (somente nomes): `DS_E2E_BASE_URL`, `DS_E2E_EMAIL`,
`DS_E2E_PASSWORD`, `DS_E2E_EMAIL_TO`, `DS_E2E_CONFIRM` (precisa ser `yes`) e,
para o cliente Supabase, `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Valores nunca são impressos.

Cadeia validada em `lib/e2e/plan.js` (27 passos, na ordem do Registro Canônico) e
em `scripts/e2e-authenticated.mjs`: sessão admin por `signInWithPassword`;
prospecção; deduplicação; qualificação; diagnóstico; auditoria social; preview;
editor; comparador; proposta; renegociação **com teto de preço público**; capa;
rascunho e edição de e-mail; `reviewed` → `approved` → `sent_simulated`;
follow-up; timeline; pedido; checkout; pagamento; contrato HTML/DOCX; handoff;
financeiro/comissão; reload/persistência.

Limites a considerar antes de executar: o passo de envio usa `sent_simulated`,
portanto **não prova entrega real pelo Resend**; o runner **não faz cleanup**
(o lead `e2e-<runId>`, proposta, pedido, contrato e eventos permanecem no banco
alvo); o alvo preferencial é **Preview isolado**, nunca Production sem
autorização; e o usuário admin precisa existir no mesmo Supabase apontado por
`NEXT_PUBLIC_SUPABASE_URL`.

### 3. Resend — contrato de código conferido, prova ambiental pendente

Auditoria de código (não repetição de trabalho anterior): `app/api/email-send/route.ts`
exige sessão (401) e papel `admin` (403); recusa envio fora de `approved` com 409
(portanto **aprovação humana é pré-condição**); exige assunto, corpo e destinatário
válido; lê `RESEND_API_KEY` **somente no servidor** (503 se ausente); envia pelo
SDK oficial; em erro do provider lança e não marca enviado; em sucesso grava
`status: "sent"` e `provider_message_id`. `lib/email/provider.ts` falha fechado
quando o provider é `resend` e a chave não existe (`provider_not_configured`).
`test/email-provider.test.js` cobre esse contrato.

O que só o ambiente alvo pode provar: `ds_settings.email_provider = resend`,
remetente/domínio corretos, e um envio real disparado pelo fluxo do CRM (o passo
E2E atual usa `sent_simulated`), com registro de `sent` + `provider_message_id` e
erro do provider auditado.

### 4. PR #14 — bateria completa no HEAD atual

- `node --experimental-strip-types --test`: **78/78 aprovados**.
- `tsc --noEmit`: exit 0. `git diff --check`: limpo.
- Varredura de segredos: **0 ocorrências em 224 arquivos**.
- `sync-dashboard` + `production-dashboard-patch`: executados, sem alteração de
  conteúdo em `public/dashboard.html`.
- `next build`: exit 0.
- Comparação com `hardening/phase-a-containment-clean`: 30 arquivos, +2646/-7,
  sem arquivo de preço comercial, canal ou catálogo novo; a única regra de preço
  é o **teto do preço público persistido** com o desconto levado como cupom, o
  que é exatamente o escopo autorizado do OPS-COUPON-001. Nenhuma decisão
  comercial, de preço ou de canal foi inventada.

### 5. Migrations

Inventário do repositório: `db/migrations/001_commercial_core.sql`,
`002_lead_identity.sql`, `003_recommendation_feedback.sql`,
`supabase/migrations/20260914031102_dattaseller_web_schema.sql`,
`20260915000000_phase_a_containment.sql`,
`20260915212624_add_prospector_reconciliation.sql` e, **única adicionada pela
#14**, `20260917000000_add_order_coupon.sql`. Essa última **já está aplicada** no
Supabase de Production do CRM (D-015, verificada de forma independente em D-016:
17 colunas, 5 constraints, 0 pedidos, 0 violações). Não há migration pendente
exigida antes do E2E; rollback está documentado e não foi exercitado.

## Modo fechamento total (2026-09-18)

- **Cleanup do E2E entregue:** `lib/e2e/cleanup.js` + `scripts/e2e-cleanup.mjs`
  (`npm run e2e-cleanup`), com escopo `e2e-<runId>`, dry-run por padrão,
  `--cleanup --confirm=<runId>`, idempotência, falha fechada, preservação de
  pedido pago e da trilha de auditoria, resumo sanitizado e 10 testes novos.
- **Documento de evidência do Final Gate n. 4:** `docs/FINAL-GATE-4-EVIDENCIA.md`
  (target, configuração por nome, passo a passo, e-mail real e persistência),
  pronto para preenchimento humano.
- **Auditoria do site público:** `docs/FINAL_ACCEPTANCE_DATTASELLER.md`.
  Headers de segurança incompletos (FAIL), `og:image` ausente (FAIL), formulário
  sem rate limit público (FAIL), claims de Google/Instagram/TikTok sem integração
  e WhatsApp apenas como link `wa.me`, e **COMERCIAL_CONFLICT** entre o catálogo
  do site (USD e BRL) e `ds_products` (BRL, `max_discount_pct 20`, itens
  `is_demo = true`). O formulário posta em `POST /api/leads` no próprio domínio e
  o intake existe no candidato, mas a prova `SITE_FORM_SUBMITTED →
  CRM_LEAD_CREATED` não foi executada.
- **Regressão no head `d19f81c`:** 88/88 testes, `tsc` exit 0, `git diff --check`
  limpo, 0 segredos em 224 arquivos, sync+patch sem alteração, `next build` exit 0.

## Próximo item executável

Achado de escopo em 2026-09-18: o site público **não** é servido por este
repositório (a copy não existe aqui, o `app/layout.tsx` é o do CRM com `noindex`
e o `next.config.ts` desta candidata já define todos os headers de segurança que
o site ao vivo não envia). Os FAILs de header, `og:image` e rate limit do
formulário pertencem ao projeto do site e não podem ser corrigidos aqui sem
violar o isolamento.

Concluído em 2026-09-18 (ciclo seguinte): **auditoria estática do CRM por área**
registrada em `docs/FINAL_ACCEPTANCE_DATTASELLER.md` — 17 áreas com AUTH
verificada no código (todas retornam `unauthorized` 401 sem sessão via
`db.auth.getUser()`), soft delete respeitado na listagem de leads, slug validado
por `isSafeLeadSlug`, entrada de lead com allowlist, teto de preço público e
`max_discount_pct` na negociação, envio real exigindo `approved` (409),
reset DEMO removido do dashboard publicado por teste. Todas PASS (estático);
runtime, dados reais, erros JS e UX por dispositivo seguem BLOCKED por falta de
sessão no Preview.

Trabalho seguro dentro do escopo: manter o documento de aceitação, o Registro
Canônico, o checkpoint e o DattaBrain em sincronia; revisar contratos locais
(checkout, cupom, contrato DOCX, plano E2E) e o cleanup contra regressões; e
reverificar o bloqueio de Preview a cada ciclo, sem tentar contorná-lo.

Verificação de Preview em 2026-09-18 (head `6246c56`): a URL publicada pela
Vercel para a PR #14 responde **302 para `vercel.com/sso-api`**, ou seja, o
Preview está protegido por Vercel Authentication. A comparação de headers segue
BLOCKED (o 302 é da borda, não da aplicação) e o E2E autenticado depende de
*Protection Bypass for Automation*, de desligar a proteção do Preview ou de um
alvo não protegido — decisão e credencial humanas.

Concluído em 2026-09-18 (ciclo de 30 min): **cleanup do E2E endurecido contra
escopo hostil** — 6 testes novos provam que slug parecido não é capturado,
`APROVADO`/`settled` preservam o pedido, `--purge-audit` não alcança timeline de
outro lead, confirmação com caixa/espaço diferente não muta, falha de delete no
store propaga (fail-closed) e pedido/contrato de outro lead permanecem. Suíte
total: **94/94**, `tsc --noEmit` exit 0, `git diff --check` limpo, varredura de
segredos 0 ocorrências em 229 arquivos.

### Ciclo 2026-09-18 (14h) — acesso Vercel obtido e lacuna da timeline corrigida

- **Vercel deixou de ser bloqueio de credencial:** a CLI 59.17.0 está presente e autenticada (`vercel whoami` → `dralangtoliveira-7763`). `vercel project ls` no scope `datta-x` mostrou `v0-project` servindo `https://crm.datta360.com.br` (o mesmo projeto linkado neste repositório) e `datta360` servindo o site público — confirmando, por outra via, que o site é projeto separado.
- **Lacuna real corrigida (`app/api/[...path]/route.ts`):** a trilha de auditoria era somente escrita; nada lia `ds_timeline` e o runner E2E exige `GET /api/timeline` nos passos `email_timeline` e `reload`. O endpoint passou a existir, com `?lead=` validado por `isSafeLeadSlug` (400 em slug inválido), ordem decrescente e limite de 500 linhas.
- **Evidência:** 94/94 testes, `tsc --noEmit` exit 0, `git diff --check` limpo, varredura de segredos 0 ocorrências em 229 arquivos.
