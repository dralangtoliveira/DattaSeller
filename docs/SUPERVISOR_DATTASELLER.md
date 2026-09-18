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

## Próximo item executável

Executar o runbook do Final Gate n. 4 (`docs/RUNBOOK-FINAL-GATE-4-E2E-2026-09-17.md`)
em tudo que não depende de credencial: validar o plano do harness E2E contra a
documentação, conferir que cada passo tem pré-condição verificável e preparar o
documento de evidência com os campos exatos que o operador humano precisa
preencher quando `DS_E2E_*` e o acesso ao Preview existirem. As PRs #6, #10, #11,
#12, #13 e #14 seguem abertas para revisão humana.
