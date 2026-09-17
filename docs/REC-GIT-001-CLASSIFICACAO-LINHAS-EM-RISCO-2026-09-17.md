# REC-GIT-001 — Classificação das linhas em risco

Data: 2026-09-17. Complementa
[`REC-GIT-001-RECONCILIACAO-BRANCHES-2026-09-17.md`](REC-GIT-001-RECONCILIACAO-BRANCHES-2026-09-17.md)
com o detalhe por commit e a classificação pedida:

- **A** — já incorporado à canônica;
- **B** — ainda necessário;
- **C** — potencialmente obsoleto;
- **D** — conflito que exige decisão humana.

**Nada foi descartado, deletado, mesclado ou sofreu force push.** Esta
classificação é registro, não autorização.

## PR #6 `finalize/crm-proposal-artifacts` — auditoria commit a commit

| # | SHA | Mensagem | Arquivos | Finalidade | Equivalente na canônica? | Classificação |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `d02bfe4` | feat: include diagnosis and social direction in proposal cover | `lib/prospector-proposal-cover.js` (+29/−2) | capa da proposta passa a citar diagnóstico e direção social | parcial: a canônica tem `renderProspectorProposalCover` com preview e WhatsApp, sem diagnóstico/social | **D** |
| 2 | `33f5d60` | feat: render proposal artifacts from persisted CRM data | `app/api/proposals/[id]/cover/route.ts` (+101) | rota dedicada para a capa usando dados persistidos | **implementação alternativa**: a canônica serve `GET /api/proposals/:id/cover` dentro do catch-all `app/api/[...path]/route.ts` | **D** |
| 3 | `1d6fedc` | test: cover proposal diagnosis and social artifacts | `test/proposal-artifacts.test.js` (+42) | testes dos dois commits acima | não | **B**, condicionado à decisão dos itens 1 e 2 |
| 4 | `a4260a8` | ci: gate Vercel deployments on tests and build | `vercel.json` (+1/−1) | roda a suíte antes do build na Vercel | não existia na canônica | **A** — incorporado no PR #13 |
| 5 | `1340746` | fix: preserve explicit production build after test gate | `vercel.json` (+1/−1) | mantém o build explícito depois do gate | não existia na canônica | **A** — incorporado no PR #13 |

**Gate de CI isolado:** somente os commits 4 e 5, ambos tocando apenas
`vercel.json`. Efeito líquido: `npm test &&` antes do build explícito.
Incorporado por cherry-pick seletivo no PR #13 (`codex/vercel-ci-gate`),
commits `ae16332` (origem `a4260a8`) e `b01a7eb` (origem `1340746`).

### Risco de cherry-pick

| Commit | Risco | Motivo |
| --- | --- | --- |
| 4 e 5 | **baixo** | um único arquivo de configuração, sem código de aplicação; cherry-pick aplicou sem conflito |
| 1 e 2 | **alto** | disputam o mesmo caminho de endpoint que já existe na canônica, com implementação diferente |
| 3 | médio | depende de 1 e 2 |

### Dependências internas

`1340746` depende de `a4260a8` (corrige a decisão anterior do mesmo arquivo).
`1d6fedc` testa `d02bfe4` e `33f5d60`. Não há dependência entre o par de CI e o
par de proposta — foi exatamente por isso que a separação foi possível sem
inventar comportamento.

## `hardening/audited-production-fixes` local — 3 commits não publicados

| SHA | Mensagem | Arquivos e verificação na canônica | Classificação |
| --- | --- | --- | --- |
| `7653aa0` | fix: contain phase A security controls | a maioria existe (`lib/hardening/guards.ts`, `app/login/actions.ts`, `next.config.ts`, `scripts/production-dashboard-patch.mjs`, `test/phase-a-hardening.test.js`); a migration aparece como `20260916131646_phase_a_containment.sql` contra `20260915000000_phase_a_containment.sql` na canônica | **C** (mesmo conteúdo, nome diferente) |
| `44bb048` | feat: restore assisted prospecting and deduplication | `app/api/[...path]/route.ts` existe; **`lib/prospector/identity.ts` está ausente** na canônica (que implementa a identidade em `lib/prospector.js`); `docs/RECONCILIACAO-PROSPECTOR-MATRIZ-2026-09-16.md` ausente (a canônica tem `RECONCILIACAO-MATRIZ-DS-MVP.md`) | **C** com ressalva — implementações paralelas precisam ser comparadas antes de qualquer descarte |
| `8bd0323` | feat: integrate factual visual redesign previews | `app/api/[...path]/route.ts` existe; **`lib/prospector/redesign.ts` ausente** na canônica (que usa `lib/prospector-redesign.js`) | **C** com a mesma ressalva |

Estes 3 commits **não estão publicados** (`ahead 3, behind 3` do próprio
origin). Preservar o worktree `.codex-worktrees/hardening-reconciliation`.

## `codex/mvp-local-ready` — 6 commits locais não publicados

| SHA | Mensagem | Classificação |
| --- | --- | --- |
| `a9dd825` | feat: add editable commercial catalog | **D**: traz `poc/dattaseller-local/app/catalog.py`, `poc/dattaseller-local/tests/test_catalog.py` e `docs/05-catalogo-comercial-editavel.md`, que **não existem** na canônica; a linha web já tem catálogo editável por `PUT /api/products` — decisão humana sobre portar ou não |
| `d5f049c` | docs: audit remaining MVP acceptance cards | **B**: evidências 10, 11, 12, 15 e 16 da POC |
| `4721588` | feat: complete local commercial pilot | **D**: `poc/dattaseller-local/app/sites/**`, `site-preview/**` e as evidências de piloto (17 e capturas) não existem na canônica |
| `ac480ea` | feat: close final commercial blockers | **D**: evidências 18 e mudanças de dashboard/skills da POC |
| `1106902` | docs: delimit final commercial decisions | **B**: evidências 19, 20 e 21 (ficha Datta360°, VPS Agent, Paymenter checkout ready) |
| `869c7a9` | feat: include TikTok in Datta360 scope | **B**: evidência 22 (`decisao-datta360-tiktok.md`) é a origem documental do canal TikTok em OPS-360-CHANNELS-001 |

## `origin/main` — 10 commits exclusivos, sem ancestral comum

| SHA | Mensagem | Classificação |
| --- | --- | --- |
| `c25ad3c` | Record Prospector proposal source provenance | **A** por conteúdo (proveniência preservada em `vendor/prospector-original` + `SHA256SUMS.txt`) |
| `984d28d` | Import Prospector proposal cover template into DattaSeller | **A** por conteúdo (`lib/prospector-proposal-cover.js` existe na canônica) |
| `8420b70` | Import Prospector proposal skill into DattaSeller | **A** por conteúdo (`poc/dattaseller-local/skills/prospector-proposta/`) |
| `7653686`, `fba0054`, `33d31bb`, `0803ce2`, `6a47a39`, `b23a3aa`, `e2bbccd` | documentação base do DattaSeller (arquitetura, escopo, MVP 24h, enriquecimento) | **A** por conteúdo: a canônica tem `docs/00`, `docs/03`, `docs/04-mvp-local-prospector-dattaseller-24h.md` e correlatos |

Mesmo classificada como A por conteúdo, a linha **permanece preservada**: não
compartilha ancestral com a canônica e não é alvo de merge.

## `codex/venda-rapida-proposta` — 21 commits, upstream `origin/main`

- Composição verificada: os 13 commits de `codex/mvp-local-ready` + os 3 imports
  de `origin/main` + o merge `896645e` + os 6 commits locais de
  `mvp-local-ready`.
- Classificação: **C** no conjunto (o conteúdo já está inventariado em outras
  linhas) e **D** especificamente no merge `896645e`, porque ele codifica
  resoluções de conflito que só uma decisão humana pode validar.
- Preservada integralmente. Nenhum merge foi tentado.

## Resumo

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| PR #6 | 2 (CI — já no PR #13) | 1 | 0 | 2 |
| `hardening/audited-production-fixes` local | 0 | 0 | 3 | 0 |
| `codex/mvp-local-ready` local | 0 | 2 | 0 | 4 |
| `origin/main` | 10 | 0 | 0 | 0 |
| `codex/venda-rapida-proposta` | 0 | 0 | 20 | 1 (merge) |

Nada acima autoriza descarte: as classificações **C** e **D** existem
justamente para preservar o material até decisão explícita.
