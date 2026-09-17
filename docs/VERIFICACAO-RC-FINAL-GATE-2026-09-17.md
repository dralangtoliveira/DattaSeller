# Verificação independente do Release Candidate e do gate — 2026-09-17

Objetivo: reproduzir localmente, sem confiar na declaração do registro, a
evidência do Release Candidate (RC) do Final Gate n. 4 e do gate de CI da
Vercel. Nenhum segredo foi lido e nenhuma escrita foi feita em `.git`.

## Método

A worktree de verificação não pôde ser criada (`git worktree add` exige escrita
em `.git/worktrees`, bloqueada por permissão neste ambiente). O conteúdo do
commit foi então extraído, sem escrever em `.git`:

```powershell
git archive --format=tar --output .codex-worktrees\rc.tar <commit>
tar -xf .codex-worktrees\rc.tar -C .codex-worktrees\rc-final-gate-verify
New-Item -ItemType Junction -Path .codex-worktrees\rc-final-gate-verify\node_modules -Target <repo>\node_modules
```

Ambiente: Node v24.21.0, Windows. Scripts executados exatamente como o
`package.json` e o `vercel.json` definem.

## Resultado — RC `207a870` (`codex/release-candidate-final-gate`, antes da correção)

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Testes | `node --experimental-strip-types --test` | 69 testes, 69 pass, 0 fail, 0 skipped (1,76 s) |
| Tipos | `node node_modules\typescript\bin\tsc --noEmit` | exit 0 |
| Prebuild | `node scripts\sync-dashboard.mjs` + `node scripts\production-dashboard-patch.mjs` | exit 0; patch aplicado em `public/dashboard.html` |
| Build | `node node_modules\next\dist\bin\next build` | exit 0; compilou em 36,2 s, TypeScript 15,6 s, 7 rotas geradas |

Conclusão: a evidência de D-013 ("69/69 testes, tsc limpo, build ok") é
**reproduzível** no conteúdo exato do commit, de forma independente.

## Resultado — RC `de2c228` (`codex/release-candidate-final-gate`, após a correção de preço)

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Testes | `node --experimental-strip-types --test` | 71 testes, 71 pass, 0 fail, 0 skipped (2,96 s) |
| Tipos | `node node_modules\typescript\bin\tsc --noEmit` | exit 0 |
| Espaço em branco | `git diff --check` | exit 0 |
| Prebuild | scripts de sync e patch do dashboard | exit 0 |
| Build | `next build` | exit 0 |

A diferença de 69 → 71 é exatamente os dois testes novos da correção do teto de
preço (ver `docs/REVISAO-OPS-COUPON-001-TETO-DE-PRECO-2026-09-17.md`).

## Gate de CI da Vercel no RC atualizado

`vercel.json` no RC define
`buildCommand: "npm test && node scripts/sync-dashboard.mjs && node scripts/production-dashboard-patch.mjs && next build"`.
O deployment do commit `de2c228` foi publicado:

```json
{"context":"Vercel","description":"Deployment has completed","state":"success",
 "target_url":"https://vercel.com/datta-x/v0-project/4jxfXQPbg1cxsB1EQzgK8oVcZevN"}
```

Deployment `6511101429`, `environment = Preview`, `ref = de2c228`, criado em
2026-09-17T20:03:18Z. Como o `buildCommand` inclui `npm test`, um teste
vermelho derrubaria o build: o estado `success` é evidência indireta de que os
71 testes passaram também no build da Vercel. O log bruto do build **não** foi
lido nesta sessão (exigiria token válido da Vercel) — a leitura direta continua
pendente de credencial.

## O que esta verificação NÃO cobre

1. Identidade do deployment que serve `crm.datta360.com.br` (bloqueio de
   credencial da Vercel, D-008).
2. E2E autenticado (login de admin, `DS_E2E_*`) — sem credenciais.
3. Envio real pelo Resend a partir do fluxo do CRM — exige
   `RESEND_API_KEY` no alvo e `email_provider = resend`.
4. Estado do banco de Production — tratado separadamente na verificação da
   migration do cupom.

Uma reprodução local verde não substitui os itens 1 a 3: ela apenas remove a
dúvida sobre o código que será promovido.

## Sondagem HTTP do Preview — achado novo

1. Tentativa de derivar a URL do novo deployment a partir do id exibido no
   dashboard (`v0-project-4jxfXQPbg1cxsB1EQzgK8oVcZevN-datta-x.vercel.app`):
   `/login` e `/` responderam **404**. Ou seja, o id do dashboard não é o
   segmento usado na URL do deployment. A sondagem é **inconclusiva** e não
   contradiz o estado `success` registrado pelo GitHub — apenas confirma que a
   URL de Preview não é derivável sem token.
2. A URL de Preview registrada em D-013
   (`https://v0-project-4u03bmicy-datta-x.vercel.app/login`) responde:

```
status  = 302
server  = Vercel
location= https://vercel.com/sso-api?url=https%3A%2F%2Fv0-project-4u03bmicy-datta-x.vercel.app%2Flogin&nonce=…
set-cookie: _vercel_sso_nonce=…; Max-Age=3600; Path=/; Secure; HttpOnly; SameSite=Lax
```

**Consequência direta para o Final Gate n. 4:** os deployments de Preview estão
protegidos por **Vercel Authentication (SSO)**. O E2E autenticado não consegue
sequer alcançar `/login` em um Preview sem uma das três condições: (a) um
**Protection Bypass for Automation** do projeto, enviado no cabeçalho
`x-vercel-protection-bypass`; (b) execução contra o domínio público de
Production; ou (c) desligar a proteção do Preview — mudança de estado que não
se faz sem autorização. Nenhuma das três está disponível hoje, e isso passa a
fazer parte do bloqueio de credencial registrado em D-021.
