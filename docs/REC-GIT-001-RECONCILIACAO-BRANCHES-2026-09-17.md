# REC-GIT-001 — Reconciliação real das linhas Git

Data: 2026-09-17. Base de comparação: linha canônica
`origin/hardening/phase-a-containment-clean` em `a466cf3`.

Métricas usadas, todas medidas com `git` local após `git fetch --prune`:

- **mb**: `git merge-base <ref> <canônica>`; `NENHUM` significa que não existe
  ancestral comum.
- **exclusivos**: `git rev-list --left-right --count <ref>...<canônica>` (o
  primeiro número é o de commits que só existem na branch).
- **cherry**: `git cherry <canônica> <ref>`; `-N` conta patches que já existem
  na canônica por conteúdo, `+N` conta patches que não existem.

## Linhas já integradas à canônica

| Branch / ref | Commit | Funcionalidade | Evidência | Integrada |
| --- | --- | --- | --- | --- |
| `hardening/phase-a-containment-clean` | `a466cf3` | linha canônica | HEAD com os merges #7, #8 e #9 | **é a canônica** |
| `origin/hardening/audited-production-fixes` | `04adeb6` | contenção Fase A | ancestral da canônica | sim |
| `origin/prospector/reconciliation` | `08beb8a` | reconciliação Prospector | merge do PR #5 (`532f865`) | sim |
| `origin/fix/resend-on-prod-base` | `19a709a` | base de envio Resend | ancestral da canônica | sim |
| `origin/codex/mvp-local-prospector` | `0a76773` | workflow Prospector | ancestral da canônica | sim |
| `master` (local, sem upstream) | `685564b` | ponteiro histórico local | ancestral da canônica | sim (conteúdo); ponteiro local inútil |

## Trabalho divergente ou não incorporado — NÃO perder

| Branch / ref | Commit | Funcionalidade | Testes/evidências | Integrada? | Situação |
| --- | --- | --- | --- | --- | --- |
| `origin/finalize/crm-proposal-artifacts` (**PR #6 aberto**) | `1340746` | artefatos visuais da proposta, gate de CI para a Vercel, build explícito após o gate | 5 commits exclusivos, `cherry +5` | **não** | trabalho real não incorporado; o gate de CI `ci: gate Vercel deployments on tests and build` não existe na canônica |
| `hardening/audited-production-fixes` (worktree local) | `8bd0323` | previews factuais de redesign, prospecção assistida, contenção Fase A | `cherry +3`; `ahead 3, behind 3` do próprio origin | não | **3 commits locais não publicados** — risco de perda |
| `codex/mvp-local-ready` (local) | `869c7a9` | TikTok no escopo Datta360°, decisões comerciais finais, bloqueios finais | `cherry +13`; 6 commits além do próprio origin | não | **6 commits locais não publicados** |
| `origin/codex/mvp-local-ready` | `d90844e` | preview visual da Vercel, salvaguardas do MVP local | 13 exclusivos, `-6` equivalentes | não | histórico reaproveitável (referência do REC-UI-001) |
| `codex/mvp-local-prospector` (local) | `177bbab` | reconciliação do workflow Prospector com o CRM web | `cherry +1` | conteúdo presente por outra via | a migration entrou na canônica renomeada (`20260915212624` em vez de `20260915181215`), então o patch-id não coincide; manter como histórico |
| `origin/fix/resend-email-ui` | `3bd900b` | tentativa anterior do fluxo de e-mail aprovado via Resend | `cherry -2, +1` | parcial | 2 patches já equivalentes ao entregue no PR #7; 1 commit exclusivo |
| `origin/fix/production-crm-ui` | `11ddb22` | merges dos PRs #3 e #4 | 2 commits, ambos merge | parcial | histórico de merges; não traz conteúdo novo |
| `origin/main` | `c25ad3c` | proposta e skills do Prospector | `mb NENHUM`, 10 exclusivos, `cherry +9` | **não** | linha sem ancestral comum; não é alvo de merge sem reconciliação |
| `codex/venda-rapida-proposta` (local, upstream `origin/main`) | `896645e` | "venda rápida" / integração do MVP local | `mb NENHUM`, 21 exclusivos, `cherry +14` | **não** | linha paralela; upstream aponta para `main` |
| `origin/v0/dattaseller-visual` | `a82bad0` | starter visual do v0 | `mb NENHUM`, 4 exclusivos, `cherry +4` | **não** | linha separada; ver REC-UI-001 |

## Worktrees ativos

Existem quatro worktrees em `.codex-worktrees/`, cada um com a sua branch
reservada:

| Worktree | Commit | Branch |
| --- | --- | --- |
| `.codex-worktrees/hardening-reconciliation` | `8bd0323` | `hardening/audited-production-fixes` |
| `.codex-worktrees/mvp-local-ready` | `869c7a9` | `codex/mvp-local-ready` |
| `.codex-worktrees/prospector-verification` | `08beb8a` | `prospector/reconciliation` |
| `.codex-worktrees/venda-rapida-proposta` | `896645e` | `codex/venda-rapida-proposta` |

Nenhum worktree foi alterado, removido ou mesclado nesta reconciliação.

## Conclusão

- A canônica `hardening/phase-a-containment-clean@a466cf3` contém todo o
  trabalho do Prospector, da contenção Fase A e do CRM web entregue até aqui.
- **Quatro frentes têm trabalho que não está na canônica e não pode ser
  perdido**: PR #6 (`finalize/crm-proposal-artifacts`, 5 commits),
  `hardening/audited-production-fixes` local (3 commits não publicados),
  `codex/mvp-local-ready` local (6 commits não publicados) e a linha
  `main`/`venda-rapida-proposta` (sem ancestral comum).
- Nenhum merge cego foi feito. Cada frente precisa de decisão explícita
  (incorporar por PR, preservar como histórico ou descartar com registro).
