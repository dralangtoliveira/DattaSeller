# REC-CANON-001 — Registro Canônico versionado do DattaSeller

Data de abertura: 2026-09-17. Este arquivo é o registro canônico versionado do
DattaSeller. Cada decisão entra com os campos exigidos. Nenhum segredo é
registrado aqui.

Campos: **data · assunto · decisão · motivo · fonte · URL/caminho/commit ·
componente · cards afetados · responsável · evidência · condição de revisão.**

## D-001 — Linha canônica da reconciliação Prospector

| Campo | Valor |
| --- | --- |
| data | 2026-09-16 |
| assunto | destino da reconciliação Prospector → DattaSeller |
| decisão | head `prospector/reconciliation`, base `hardening/phase-a-containment-clean` a partir de `04adeb6`; `main` e `fix/production-crm-ui` excluídas como alvo |
| motivo | preservar a contenção da Fase A e evitar linha sem ancestral comum |
| fonte | decisão registrada em documento do repositório |
| caminho | `docs/DECISAO-DESTINO-RECONCILIACAO-2026-09-16.md` |
| componente | Git / processo |
| cards afetados | REC-GIT-001, REC-CANON-001 |
| responsável | operador humano |
| evidência | PR #5 mesclado em `532f865` |
| condição de revisão | nova decisão explícita de destino |

## D-002 — Linha canônica ativa e PRs mesclados

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | integração das entregas de e-mail, documentação e contenção |
| decisão | `hardening/phase-a-containment-clean` é a linha canônica ativa; PRs #7, #8 e #9 mesclados nela |
| motivo | autorização do responsável e revisão concluída |
| fonte | GitHub |
| commit | merges `0c78fc4` (PR #7), `3a3bc45` (PR #8), `a466cf3` (PR #9); canônica em `a466cf3` |
| componente | Git, CRM web |
| cards afetados | OPS-EMAIL-001, OPS-CONTRATO-001, DS-MVP-INVENTARIO, contenção DEMO |
| responsável | operador humano (autorização) e Codex (execução) |
| evidência | `git log` da canônica e estado dos PRs no GitHub |
| condição de revisão | — |

## D-003 — Regra de trabalho em Git

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | como entregar mudanças |
| decisão | nunca commitar direto na linha canônica; usar branch `codex/*`, PR com base na canônica, stage por arquivo (nunca `-A`), sem merge/deploy/migration sem autorização |
| motivo | instrução explícita do responsável após um commit ter caído na canônica |
| fonte | instrução do responsável |
| componente | Git / processo |
| cards afetados | REC-GIT-001 |
| responsável | Codex (execução) |
| evidência | PRs #7, #8 e #9 abertos em `codex/*` com base na canônica |
| condição de revisão | — |

## D-004 — Follow-up de e-mail usa o schema existente

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | follow-up do e-mail comercial |
| decisão | `POST /api/emails/:id/follow-up` cria novo rascunho ligado ao envio original e registra o agendamento em `ds_followups`, com prazo de `settings.followup_days`; somente após `sent`, `delivered_simulated`, `no_reply` ou `generic_reply`; sem envio automático |
| motivo | a tabela já existia no schema e não era usada; o envio exige aprovação humana |
| fonte | PR #7 |
| commit | `51bdb7f` (merge `0c78fc4`) |
| componente | CRM web / e-mail |
| cards afetados | OPS-EMAIL-001 |
| responsável | Codex |
| evidência | `docs/EVIDENCIA-OPS-EMAIL-001-E-OPS-CONTRATO-001-2026-09-16.md`, `test/email-follow-up.test.js` |
| condição de revisão | mudança de cadência decidida pelo operador |

## D-005 — Contrato com DOCX gerado na própria linha web

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | download do contrato |
| decisão | `GET /api/contracts/:id/docx` gera OOXML em Node puro (`lib/contracts/docx.js`), sem dependência nova; produto demo bloqueado |
| motivo | o botão do CRM apontava para rota inexistente e recebia JSON |
| fonte | PR #7 |
| commit | `51bdb7f` (merge `0c78fc4`) |
| componente | CRM web / contratos |
| cards afetados | OPS-CONTRATO-001 |
| responsável | Codex |
| evidência | `test/contract-docx.test.js`, extração por `Expand-Archive` + parser XML |
| condição de revisão | template jurídico definitivo |

## D-006 — Reset de dados DEMO não existe na linha web

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | contenção da Fase A no dashboard publicado |
| decisão | a API web não implementa reset; o botão da POC é removido no patch de produção por regex ancorado no endpoint, e o build falha se o alvo desaparecer |
| motivo | Production não pode resetar dados reais |
| fonte | PR #9 |
| commit | `c54a5ad` (merge `a466cf3`) |
| componente | dashboard publicado |
| cards afetados | contenção Fase A, DS-MVP-39/40 |
| responsável | Codex |
| evidência | `test/phase-a-hardening.test.js` |
| condição de revisão | — |

## D-007 — Inventário DS-MVP-01 a 48 fechado na linha web

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | fechamento do inventário local de 2026-09-13 |
| decisão | 41 itens PRONTO (web), 5 PARCIAL (web), 2 NÃO MIGRADO por decisão; o inventário 17 continua medindo a linha local |
| motivo | o inventário antigo media a linha local, não a linha web |
| fonte | PR #8 |
| commit | `8f9aa7e` (merge `3a3bc45`) |
| caminho | `docs/FECHAMENTO-INVENTARIO-DS-MVP-2026-09-16.md` |
| componente | CRM web |
| cards afetados | DS-MVP-INVENTARIO |
| responsável | Codex |
| evidência | controle item a item com âncora de código e teste |
| condição de revisão | quando o E2E autenticado fechar os 5 parciais |

## D-008 — Vercel sem credencial válida

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | identificar o deployment de `crm.datta360.com.br` |
| decisão | registrar o bloqueio: a credencial da CLI responde `invalidToken`; o mapeamento domínio↔deployment permanece desconhecido e não é presumido |
| motivo | sem token válido não há leitura de aliases, domínio do projeto ou deployment de Production |
| fonte | consulta à API da Vercel e sondagem HTTP do domínio |
| caminho | `docs/EVIDENCIA-PRODUCTION-DEPLOYMENT-2026-09-17.md` |
| componente | Vercel / Production |
| cards afetados | Final Gate n. 4 |
| responsável | operador humano (credencial) |
| evidência | `invalidToken: true`; domínio responde 307 → `/login` com `Server: Vercel` |
| condição de revisão | `vercel login` ou token com acesso ao scope `datta-x` |

## D-009 — Envio real pelo Resend

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | `DS-WEB-RESEND-001` |
| decisão | marcar como **parcial**: domínio/remetente verificados e envio real simples concluídos; falta o envio pelo fluxo completo do CRM (proposta → aprovação → endpoint → Resend → entregue → timeline → reload), que passa a fazer parte do Final Gate n. 4 |
| motivo | o teste que importa é o do fluxo do sistema, não só o do provedor |
| fonte | declaração do responsável em 2026-09-17 |
| componente | CRM web / e-mail |
| cards afetados | DS-WEB-RESEND-001, Final Gate n. 4 |
| responsável | operador humano (declaração) e Codex (teste) |
| evidência | pendente de execução no E2E |
| condição de revisão | E2E de envio concluído |

## D-010 — Notion indisponível nesta sessão

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | `REC-NOTION-001` |
| decisão | registrar o bloqueio: nenhum recurso ou ferramenta do Notion está acessível nesta sessão, então a comparação card a card não pode ser executada nem registrada |
| motivo | reconciliar sem acesso produziria comparação inventada |
| fonte | verificação de ferramentas/recursos MCP na sessão |
| componente | board / governança |
| cards afetados | REC-NOTION-001 |
| responsável | operador humano (conectar o Notion) |
| evidência | nenhuma ferramenta ou recurso do Notion disponível |
| condição de revisão | conector do Notion disponível; a comparação deve preservar a origem histórica e nunca substituir decisão conflitante em silêncio |

## D-011 — Gate de CI da Vercel extraído do PR #6

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | incorporar o gate de CI da Vercel de forma isolada |
| decisão | aproveitar **somente** os commits `a4260a8` e `1340746` do PR #6 (`finalize/crm-proposal-artifacts`), ambos restritos a `vercel.json`, em branch própria `codex/vercel-ci-gate`, por cherry-pick seletivo; o gate passa a rodar `npm test` antes do build explícito na Vercel |
| motivo | preservar o trabalho do PR #6 sem incorporar as mudanças funcionais de proposta que disputam implementação com a canônica |
| fonte | auditoria commit a commit do PR #6 |
| commit | cherry-picks `ae16332` (origem `a4260a8`) e `b01a7eb` (origem `1340746`) sobre `a466cf3`; PR #13 |
| caminho | `vercel.json`; auditoria em `docs/REC-GIT-001-CLASSIFICACAO-LINHAS-EM-RISCO-2026-09-17.md` |
| componente | CI / Vercel |
| cards afetados | REC-GIT-001 |
| responsável | Codex (execução); merge pendente de autorização humana |
| evidência | `npm test` 56/56, `sync-dashboard`, `production-dashboard-patch` e `next build` com exit 0; `tsc --noEmit` exit 0; `git diff --check` exit 0; secret scan sem ocorrência; diff contra a canônica restrito a `vercel.json` |
| condição de revisão | se o PR #6 for redesenhado ou incorporado, reconciliar a origem |

## D-012 — Linhas Git em risco: preservar e classificar, sem descartar

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | destino das linhas divergentes |
| decisão | nenhuma decisão de merge, descarte, exclusão ou force push foi tomada; as linhas foram inventariadas e classificadas em A (incorporado), B (necessário), C (potencialmente obsoleto) e D (decisão humana); os 3 commits funcionais do PR #6, os 3 commits locais de `hardening/audited-production-fixes`, os 6 commits locais de `codex/mvp-local-ready` e o merge de `codex/venda-rapida-proposta` ficam preservados e pendentes |
| motivo | existe trabalho não publicado e implementações paralelas legítimas; descarte silencioso perderia histórico |
| fonte | `merge-base`, `git rev-list --left-right --count`, `git cherry`, listagem de arquivos por commit e verificação de existência na canônica |
| caminho | `docs/REC-GIT-001-CLASSIFICACAO-LINHAS-EM-RISCO-2026-09-17.md` |
| componente | Git / processo |
| cards afetados | REC-GIT-001 |
| responsável | operador humano (decisão); Codex (inventário) |
| evidência | tabelas por linha com SHA, arquivos e classificação |
| condição de revisão | decisão explícita sobre cada linha classificada como B, C ou D |

## D-013 — Release Candidate do Final Gate

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | Release Candidate em Preview para fechar o Final Gate n. 4 |
| decisão | criar `codex/release-candidate-final-gate` a partir da base exata `origin/hardening/phase-a-containment-clean` (`a466cf3`), com `--no-track`, integrando **somente** PR #13 (gate de CI), PR #12 (harness E2E) e PR #10 (cupom); PR #6, PR #1 e as linhas classificadas como B/C/D ficam fora |
| motivo | reunir o conjunto necessário para o Final Gate sem promover Production e sem incorporar trabalho não reconciliado |
| fonte | instrução do responsável de 2026-09-17 |
| commit | cherry-picks `a6b027b` + `3d12fbc` (← `ae16332` + `b01a7eb`, PR #13), `7d4f57a` (← `2803071`, PR #12), `207a870` (← `3db2a32`, PR #10) |
| caminho | branch `codex/release-candidate-final-gate`; SHA `207a870cf6097daf08bf3ed58fd48544c8c9d3f4` |
| componente | release / integração |
| cards afetados | Final Gate n. 4, OPS-COUPON-001, REC-GIT-001 |
| responsável | Codex (execução); promoção para Production depende de autorização humana |
| evidência | 69/69 testes (local e no build da Vercel), `tsc` limpo, `git diff --check` limpo, secret scan sem ocorrência, Preview `READY` em `dpl_Ch1BxNEDDWy5ynRSw9neWFNXZPKz` (`https://v0-project-4u03bmicy-datta-x.vercel.app`), log do build mostrando `Running "npm test && … && next build"` e `ℹ tests 69` |
| condição de revisão | qualquer novo commit no RC ou mudança de escopo exige nova auditoria |

## D-014 — Bloqueios de autorização do Final Gate

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | o que impede fechar o Final Gate n. 4 agora |
| decisão | não aplicar migration, não executar o E2E real e não promover Production sem autorização expressa; registrar os bloqueios com precisão |
| motivo | todos os itens restantes mudam estado de banco, de ambiente ou de Production |
| fonte | análise do runbook da migration, das variáveis da Vercel e do seed do schema |
| caminho | `docs/RUNBOOK-MIGRATION-OPS-COUPON-001-2026-09-17.md` |
| componente | banco, Vercel, E2E |
| cards afetados | OPS-COUPON-001, DS-WEB-RESEND-001, Final Gate n. 4 |
| responsável | operador humano |
| evidência | (1) `RESEND_API_KEY` existe na Vercel apenas com alvo `production`, não `preview`; (2) o seed `20260914031102_dattaseller_web_schema.sql` grava `email_provider = 'mock'`, então o envio real exige mudar essa configuração no `ds_settings` — o que afeta o mesmo banco de Production; (3) o runner do E2E exige `DS_E2E_*` e credenciais de admin, que não existem neste ambiente; (4) a migration não pode ser aplicada sem autorização |
| condição de revisão | após as autorizações, registrar as evidências de banco, do envio real e do reload |

## D-015 — Migration do cupom aplicada e validada

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | aplicar `20260917000000_add_order_coupon.sql` em Production |
| decisão | aplicar **somente** esse SQL pela Management API do Supabase em `vkvkzoulbljampcbxaim`, após confirmar o projeto e capturar o baseline read-only; sem `db push` e sem outras migrations |
| motivo | o Release Candidate `207a870` grava `public_price`, `coupon_code` e `coupon_status` ao criar pedido; sem as colunas, `POST /api/orders` falha e o Final Gate não passa de pedido |
| fonte | autorização expressa do responsável em 2026-09-17 |
| commit | blob `54852562cfaca9b23467222de70733b2d40d71ee` (RC `207a870`), SHA-256 `16c847fc5e95e447906bbc60e43c0969eb3e3a0673b45e68cfb38f4328f95a0e` |
| caminho | `supabase/migrations/20260917000000_add_order_coupon.sql`; evidência em `docs/RUNBOOK-MIGRATION-OPS-COUPON-001-2026-09-17.md` (seção 10) |
| componente | banco Supabase Production (`vkvkzoulbljampcbxaim`, org `vercel_icfg_D06arwCZ1aVDFEX08W1VGslP`, `sa-east-1`) |
| cards afetados | OPS-COUPON-001, Final Gate n. 4 |
| responsável | Codex (execução) sob autorização expressa do responsável |
| evidência | baseline 14 colunas / 3 constraints / 0 pedidos → depois 17 colunas / 5 constraints / 0 pedidos; os 2 checks novos presentes com a definição esperada; `linhas_incompativeis = 0`; leitura segura de `ds_orders` sem erro; nenhum `update`/`insert`/`delete` |
| condição de revisão | rollback documentado e não exercido; revisar se algum dia for necessário remover o cupom |
