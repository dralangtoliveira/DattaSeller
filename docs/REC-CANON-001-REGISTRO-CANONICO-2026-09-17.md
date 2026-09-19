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

## D-016 — D-015 verificada de forma independente no banco de Production

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | conferir no banco real o que D-015 afirma ter aplicado |
| decisão | **CONFIRMADO**: o estado atual de `public.ds_orders` corresponde integralmente ao registrado — 17 colunas (as 3 novas nulas, com tipo esperado), 5 constraints na tabela, 0 pedidos, 0 violações do teto; as duas constraints existem com a definição exata registrada |
| motivo | o supervisor não aceita a afirmação do executor; a verificação foi feita por consulta somente leitura, sem repetir a evidência do próprio executor |
| fonte | Management API do Supabase (`POST /v1/projects/vkvkzoulbljampcbxaim/database/query`), somente `SELECT` |
| caminho | `docs/VERIFICACAO-D015-MIGRATION-CUPOM-2026-09-17.md` |
| componente | banco Supabase Production |
| cards afetados | OPS-COUPON-001, Final Gate n. 4 |
| responsável | Codex (execução e decisão) |
| evidência | contagens `{colunas:17, constraints:5, pedidos:0}`; `violacoes:0`; `pg_get_constraintdef` das duas constraints; nenhuma mutação executada |
| condição de revisão | qualquer novo DDL em `ds_orders` exige nova verificação |

## D-017 — Risco residual do cupom refutado no estado atual dos dados

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | divergência entre o desconto do cupom (`public_price - negotiated_price`) e o `discount` do pedido (`base_price - negotiated_price`) |
| decisão | **sem instância viva**: os 4 produtos têm `public_price` e `base_price` preenchidos e iguais (`public_difere_de_base = 0`); o risco permanece registrado como condição de dados, não como defeito |
| motivo | a revisão apontou o caso como possível; a consulta mostrou que ele não ocorre hoje |
| fonte | consulta somente leitura a `public.ds_products` |
| caminho | `docs/REVISAO-OPS-COUPON-001-TETO-DE-PRECO-2026-09-17.md` |
| componente | banco Supabase Production / OPS-COUPON-001 |
| cards afetados | OPS-COUPON-001 |
| responsável | Codex |
| evidência | `{"total":4,"sem_public_price":0,"sem_base_price":0,"public_difere_de_base":0}` |
| condição de revisão | primeiro produto cadastrado com `public_price` diferente de `base_price` |

## D-018 — Revisão adversarial do caminho do dinheiro: achado P2 corrigido

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | validação do teto do preço público na linha do cupom |
| decisão | corrigir: a **criação** de proposta (`POST /proposals`) não aplicava o teto do preço público, e `createOrder` dependia do banco para barrar, devolvendo 500 (`storageUnavailable`) em vez de 400 de validação; ambos passam a usar `negotiatedPriceError` antes de gravar |
| motivo | reproduzido por execução: preço 120 com `public_price`/`base_price` 100 era aceito pela guarda antiga e violava a constraint `ds_orders_public_price_ceiling`; o efeito era erro enganoso depois da proposta já aceita |
| fonte | revisão adversarial do commit, com prova executável |
| commit | `5bade0c` em `codex/ops-coupon-001` (PR #10) e cherry-pick `de2c228` em `codex/release-candidate-final-gate` |
| caminho | `docs/REVISAO-OPS-COUPON-001-TETO-DE-PRECO-2026-09-17.md` |
| componente | CRM web / pedidos e propostas / financeiro |
| cards afetados | OPS-COUPON-001, Final Gate n. 4 |
| responsável | Codex (revisão, correção e verificação) |
| evidência | 66 testes na linha do cupom e 71 no RC, 0 falhas; `tsc --noEmit` exit 0; `git diff --check` exit 0; build `success` na Vercel para `de2c228` |
| condição de revisão | reaparecimento de preço acima do preço público em qualquer caminho de escrita |

## D-019 — RC revisado: `de2c228` substitui `207a870`

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | reauditoria do Release Candidate após novo commit (exigida pela condição de revisão de D-013) |
| decisão | o RC passa a ser `de2c228` (`207a870` + correção D-018); o conteúdo autorizado por D-013 permanece o mesmo, com o acréscimo da correção do teto de preço na mesma feature |
| motivo | D-013 declara que qualquer novo commit no RC exige nova auditoria; a correção do achado P2 foi integrada antes de qualquer promoção |
| fonte | gate local reproduzido e deployment da Vercel do novo commit |
| commit | `de2c228a42606818f6d40edbeeec49c567e83dce` |
| caminho | `docs/VERIFICACAO-RC-FINAL-GATE-2026-09-17.md` |
| componente | release / integração / CI |
| cards afetados | Final Gate n. 4, OPS-COUPON-001 |
| responsável | Codex |
| evidência | 71/71 testes, `tsc` limpo, `git diff --check` limpo, `next build` exit 0; deployment GitHub/Vercel `6511101429` (`ref = de2c228`, `environment = Preview`, estado `success`); gate de testes dentro do `buildCommand` do `vercel.json` |
| condição de revisão | novo commit no RC, mudança de escopo ou promoção para Production |

## D-020 — Production sem ledger de migrations

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | rastreio das migrations aplicadas em Production |
| decisão | registrar o achado: `supabase_migrations.schema_migrations` **não existe** no projeto de Production, logo não há histórico versionado do que foi aplicado; um `supabase db push` futuro tentaria reaplicar todo o conjunto e depende da idempotência de cada script, que ainda não foi auditada |
| motivo | a verificação read-only da migration do cupom (D-016) esbarrou na ausência do ledger |
| fonte | consulta somente leitura `select to_regclass('supabase_migrations.schema_migrations') is not null` → `false` |
| caminho | `docs/VERIFICACAO-D015-MIGRATION-CUPOM-2026-09-17.md` |
| componente | banco Supabase Production / operação |
| cards afetados | OPS-COUPON-001, governança de migrations |
| responsável | Codex (auditoria pendente); adoção do registro baseline depende de autorização humana por tocar Production |
| evidência | `{"tabela_existe": false}` |
| condição de revisão | auditoria de idempotência concluída e baseline definido |

## D-021 — Bloqueios humanos remanescentes e a ação única

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | o que impede fechar o Final Gate n. 4 |
| decisão | manter o bloqueio de credencial e declarar **uma** ação humana: autenticar a Vercel no scope `datta-x` na CLI desta máquina (`vercel login`) e dispor do token apenas em memória (`$env:VERCEL_TOKEN`), sem gravar no repositório |
| motivo | sem token válido não se identifica o deployment que serve `crm.datta360.com.br`, não se lê o log de build do Preview e não se inspecionam as variáveis do alvo; o E2E autenticado, que é o passo seguinte, já está documentado com os nomes das credenciais necessárias em `docs/EVIDENCIA-PRODUCTION-DEPLOYMENT-2026-09-17.md` (seção D) |
| fonte | tentativas registradas em D-008 e D-014 |
| caminho | `docs/EVIDENCIA-PRODUCTION-DEPLOYMENT-2026-09-17.md` |
| componente | Vercel / Production / Final Gate n. 4 |
| cards afetados | Final Gate n. 4, DS-WEB-RESEND-001 |
| responsável | operador humano (credencial) |
| evidência | `invalidToken: true`; sem acesso a `/v9/projects`, `/v6/deployments` e `/v4/aliases` |
| condição de revisão | token válido disponível e deployment de Production identificado |

## D-022 — Baseline do schema de Production e separação das linhagens de SQL

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | o que existe em Production e o que é seguro reaplicar sem ledger |
| decisão | registrar o baseline: Production contém exatamente as 20 tabelas `ds_*` da linha web; a linhagem local (`db/migrations`, `db/verification`) **não** está aplicada; o schema base `20260914031102_dattaseller_web_schema.sql` é o único arquivo **não reaplicável** (20 `create table` sem guarda); as outras três migrations são reaplicáveis; `supabase db push` contra Production fica proibido enquanto não houver ledger |
| motivo | sem ledger, um push tentaria reaplicar do zero; o baseline é a fonte para um backfill futuro e evita decisão inventada |
| fonte | consulta somente leitura a `information_schema.tables` + análise de guardas por arquivo |
| caminho | `docs/AUDITORIA-MIGRATIONS-BASELINE-2026-09-17.md` |
| componente | banco Supabase Production / operação |
| cards afetados | governança de migrations, OPS-COUPON-001 |
| responsável | Codex (auditoria); backfill do ledger depende de autorização humana |
| evidência | lista das 20 tabelas; `tabela_existe = false` para `schema_migrations`; tabela de guardas por arquivo |
| condição de revisão | adoção de ledger, criação de `supabase/seed.sql` ou qualquer novo arquivo em `supabase/migrations/` |

## D-023 — O Preview da Vercel está protegido por SSO

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | pré-requisito do E2E autenticado do Final Gate n. 4 |
| decisão | registrar o achado: uma requisição anônima ao Preview responde `302` para `https://vercel.com/sso-api?...` com `_vercel_sso_nonce`, ou seja, o ambiente de Preview está protegido por **Vercel Authentication**; o E2E só pode rodar contra um Preview com **Protection Bypass for Automation** (cabeçalho `x-vercel-protection-bypass`), contra o domínio público de Production, ou depois de desligar a proteção — as três opções dependem de credencial ou de autorização humana |
| motivo | o plano do E2E em D-014 assumia alcançar um ambiente por HTTP; a sondagem mostrou que o Preview é inacessível anonimamente, o que precisaria ser descoberto apenas na hora da execução |
| fonte | sondagem HTTP somente leitura com `Invoke-WebRequest` (sem seguir redirecionamento) |
| caminho | `docs/VERIFICACAO-RC-FINAL-GATE-2026-09-17.md` (seção "Sondagem HTTP do Preview") |
| componente | Vercel / Preview / Final Gate n. 4 |
| cards afetados | Final Gate n. 4, DS-WEB-RESEND-001 |
| responsável | operador humano (credencial/autorização) |
| evidência | `302` + `location = https://vercel.com/sso-api?url=…&nonce=…` + `set-cookie: _vercel_sso_nonce=…`; tentativa de derivar a URL do novo deployment resultou em 404 e foi classificada como inconclusiva, sem contradizer o estado `success` do deployment |
| condição de revisão | disponibilidade de bypass de proteção, de token da Vercel ou de decisão de rodar contra o domínio de Production |

## D-024 — Trabalho não reconciliado do repositório irmão `dattax` encerrado

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | risco de perda levantado por auditoria independente na cópia `dattax-codex-backend` |
| decisão | validar o pacote no próprio repositório de origem e publicá-lo na branch de execução `codex/backend` do `dattax`; **não** trazer nenhum arquivo para o DattaSeller e não propor merge entre os repositórios |
| motivo | havia 18 arquivos rastreados modificados e 38 arquivos novos sem commit naquele worktree, sem nenhuma referência no registro canônico do DattaSeller; o material existia apenas em disco |
| fonte | auditoria adversarial do próprio supervisor no repositório irmão |
| commit | `cc69a3b`, `cec1821`, `b305707`, `7e44b4e` e `f2b6cef`, enviados para `origin/codex/backend` (repo `dralangtoliveira/dattax`, PR #6) |
| caminho | `docs/REC-GIT-001-CLASSIFICACAO-LINHAS-EM-RISCO-2026-09-17.md` (Anexo); checkpoint do outro repositório em `CONTINUIDADE.md` |
| componente | governança de repositórios |
| cards afetados | REC-GIT-001 |
| responsável | Codex (execução) |
| evidência | 450 testes, `tsc --noEmit`, 16 contratos `check:*`, `next build`, `git diff --check` limpo e varredura de segredos sem ocorrência no HEAD publicado; regressão real do contrato de backup/RLS (`investigator_notes`) corrigida antes do commit; CI do HEAD `035be04` verde e CI do push pendente de conferência |
| condição de revisão | conferir o CI dos commits `7e44b4e`/`f2b6cef` na próxima execução; nenhum efeito sobre o DattaSeller além do registro |

## D-025 — CI do pacote publicado no repositório irmão `dattax` conferido e verde

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | condição de revisão deixada em aberto por D-024 |
| decisão | fechar a condição: o CI da branch `codex/backend` do repositório `dralangtoliveira/dattax` está verde em **todos** os commits do pacote publicado, inclusive os dois que D-024 mandou conferir (`7e44b4e` e `f2b6cef`); a branch está sincronizada com `origin/codex/backend` em `a882ece`; nenhum efeito sobre o DattaSeller além deste registro |
| motivo | D-024 publicou o material não reconciliado e deixou como pendência explícita a conferência do CI de `7e44b4e`/`f2b6cef` nesta execução |
| fonte | `gh run list --branch codex/backend` (consulta somente leitura, sem escrita no repositório irmão) |
| commit | `7e44b4e` → runs `35269834764` e `35269840575`; `f2b6cef` → `35269988887` e `35269994487`; `035be04` → `35261912877` e `35261916856`; `0d112e2` → `35270446984` e `35270452953`; `a882ece` → `35270598573` e `35270606353` |
| caminho | `docs/REC-GIT-001-CLASSIFICACAO-LINHAS-EM-RISCO-2026-09-17.md` (Anexo) |
| componente | governança de repositórios |
| cards afetados | REC-GIT-001 |
| responsável | Codex (verificação) |
| evidência | 10 execuções do workflow `CI` sobre os 5 SHAs do pacote, todas com `conclusion = success`; `git status -sb` do `dattax` mostra `codex/backend...origin/codex/backend` sem divergência |
| condição de revisão | qualquer novo push para `codex/backend` reabre a conferência; permanece observado (não tocado) um arquivo não rastreado `"Novo(a) Documento de Texto.txt"` no worktree do `dattax`, sem relação com o pacote |

## D-026 — Reset de escopo: este supervisor trata apenas o DattaSeller

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | escopo do supervisor, do checkpoint e das automações desta conversa |
| decisão | a partir desta data, o supervisor e qualquer automação vinculada a esta conversa tratam **exclusivamente** o DattaSeller (`dralangtoliveira/DattaSeller`, remote `https://github.com/dralangtoliveira/DattaSeller`, branch canônica `hardening/phase-a-containment-clean`). Conteúdo de DattaX, `DXM-*`, `EV-*`, `investigator_notes`, projeto Supabase `zbwspbzvndkdhjqranwz`, DattaVPS, DattaSeg, DattaLex, `tributario-rag`, Cubo e outros repositórios Datta passa a ser `FOREIGN_CONTEXT_IGNORED`: não é executado, commitado nem usado como justificativa de alteração aqui |
| motivo | instrução explícita do responsável, após a conversa acumular trabalho de outro repositório e risco de contaminação de escopo |
| fonte | instrução do responsável de 2026-09-17 (reset total de escopo) |
| caminho | `AGENTS.md` (novo, guarda persistente de isolamento) e `docs/SUPERVISOR_DATTASELLER.md` (checkpoint da automação) |
| componente | governança de escopo |
| cards afetados | REC-GIT-001, REC-CANON-001 |
| responsável | Codex (execução) sob instrução do responsável |
| evidência | `AGENTS.md` na raiz com identidade, fontes de verdade, isolamento, limites e formato de retorno; `docs/SUPERVISOR_DATTASELLER.md` com o quadro auditado; entradas D-024/D-025 permanecem apenas como história e não autorizam trabalho em outro repositório |
| condição de revisão | nova instrução explícita do responsável alterando escopo |

## D-027 — Consolidação das PRs #6, #10, #11, #12 e #13

| Campo | Valor |
| --- | --- |
| data | 2026-09-17 |
| assunto | reconciliação técnica das PRs abertas com base na canônica |
| decisão | criar a branch exclusiva de consolidação `codex/supervisor-dattaseller` a partir de `a466cf3` e integrar, por risco crescente: #11 (docs, 9 commits) → #13 (`vercel.json`, 2) → #12 (harness E2E, 1) → #10 (cupom/teto de preço, 2) → **#6 parcial** (`d02bfe4`, `33f5d60`, `1d6fedc`). Os commits `a4260a8`/`1340746` do #6 foram **descartados** por já existirem no #13 como `ae16332`/`b01a7eb` (mesmo arquivo `vercel.json`, mesmo efeito), evitando duplicação. As PRs originais permanecem intactas, sem merge, para revisão humana |
| motivo | as cinco PRs têm base na canônica e nenhuma delas sobrepõe arquivo de outra, exceto `vercel.json` entre #6 e #13; integrar sem análise duplicaria mudança de CI |
| fonte | `git log`/`git diff` locais sobre `origin/hardening/phase-a-containment-clean` e as branches de cada PR; `gh pr list` |
| commit | branch `codex/supervisor-dattaseller`, 17 cherry-picks limpos a partir de `a466cf3` |
| caminho | `docs/SUPERVISOR_DATTASELLER.md` |
| componente | Git / release |
| cards afetados | REC-GIT-001, OPS-COUPON-001, Final Gate n. 4 |
| responsável | Codex (execução); merge na canônica e promoção seguem exigindo autorização humana |
| evidência | `node --experimental-strip-types --test` → 73/73 aprovados; `tsc --noEmit` exit 0; `next build` exit 0 com `/api/proposals/[id]/cover`; `git diff --check` limpo; varredura de segredos sem ocorrência; `sync-dashboard` + `production-dashboard-patch` sem alteração de conteúdo no dashboard versionado |
| condição de revisão | qualquer novo commit nas PRs originais reabre a reconciliação; a branch #1 (`codex/mvp-local-ready`, base `main`) permanece fora e exige decisão humana |

## D-028 — PR #1 sem ancestral comum e varredura de segredos no gate de deploy

| Campo | Valor |
| --- | --- |
| data | 2026-09-18 |
| assunto | destino da linha `codex/mvp-local-ready` (PR #1) e proteção contra credencial no deploy |
| decisão | (a) **não integrar** o PR #1: a linha não tem ancestral comum com a canônica (raízes `7653686` × `83bc2cd`), está 13 commits à frente e 120 atrás dela, tem 105 arquivos contra 199 e traz um segundo esqueleto de aplicação mais binários de evidência; ela permanece preservada e intocada, e uma eventual extração será feita arquivo a arquivo em branch nova, com revisão humana. (b) Versionar `scripts/secret-scan.mjs` (`npm run secret-scan`) e ligá-lo ao `buildCommand` do `vercel.json`, de modo que a Preview falhe antes de publicar quando houver credencial de alta confiança |
| motivo | integração por merge violaria a regra de integrar somente o comprovadamente compatível; e a varredura de segredos era manual, sem barreira automática no deploy |
| fonte | `git merge-base`/`git rev-list`/`git ls-tree` sobre `origin/codex/mvp-local-ready` e `origin/hardening/phase-a-containment-clean`; `test/secret-scan.test.js` |
| commit | branch `codex/supervisor-dattaseller`; `scripts/secret-scan.mjs`, `test/secret-scan.test.js`, `package.json`, `vercel.json` |
| caminho | `docs/SUPERVISOR_DATTASELLER.md` |
| componente | Git / release / segurança |
| cards afetados | REC-GIT-001, Final Gate n. 4 |
| responsável | Codex (execução); decisão de extrair artefatos do POC continua humana |
| evidência | varredura padrão: 78/78 testes aprovados, `tsc --noEmit` exit 0, `next build` exit 0, `git diff --check` limpo; o scanner é coberto por 5 testes (detecção sem imprimir o valor, placeholders ignorados, CLI reprovando diretório com segredo e aprovando o repositório) e roda em ~0,4 s sobre 222 arquivos |
| condição de revisão | nova instrução do responsável sobre a linha do POC local ou mudança no conjunto de fornecedores cujas chaves precisam ser detectadas |

## D-029 — PR #14 é a candidata principal de integração

| Campo | Valor |
| --- | --- |
| data | 2026-09-18 |
| assunto | qual linha representa a integração e como tratar as PRs originais |
| decisão | a PR #14 (`codex/supervisor-dattaseller` → `hardening/phase-a-containment-clean`) passa a ser a **candidata principal de integração**, consolidando seletivamente o conteúdo útil das PRs #6, #10, #11, #12 e #13. Não se pede autorização separada para integrar as originais; elas permanecem intactas enquanto a #14 não passar todos os gates e só depois poderão ser classificadas como incorporadas/superseded, mediante evidência. **Nenhum merge foi feito** e nenhum deploy de Production ocorreu |
| motivo | instrução explícita do responsável, para reduzir o número de decisões humanas e manter uma única linha de integração auditável |
| fonte | instrução do responsável de 2026-09-18 |
| caminho | `docs/SUPERVISOR_DATTASELLER.md` |
| componente | Git / release |
| cards afetados | REC-GIT-001, OPS-COUPON-001, Final Gate n. 4 |
| responsável | Codex (execução); merge da #14, supressão das originais e promoção seguem exigindo autorização humana |
| evidência | PR #14 aberta, `mergeStateStatus: CLEAN`, head `51499fe`, check Vercel `SUCCESS` com o gate `npm test && secret-scan && sync && patch && next build` |
| condição de revisão | qualquer mudança de escopo na #14 ou instrução do responsável alterando a candidata |

## D-030 — Auditoria dos bloqueios externos do Final Gate n. 4

| Campo | Valor |
| --- | --- |
| data | 2026-09-18 |
| assunto | Vercel, E2E autenticado, Resend e migrations, sem depender de merge |
| decisão | registrar o estado exato: (a) **Vercel sem sessão válida** — CLI ausente do PATH, `%USERPROFILE%\.vercel\auth.json` inexistente e `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` ausentes do ambiente; o link local `.vercel/project.json` (`v0-project`, `prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM`, `team_4LMpNJbFqbxdJk09FLoNpimg`) é arquivo, não credencial, e **não** prova qual deployment serve `crm.datta360.com.br`; (b) **E2E preparado e não executado**: variáveis exigidas são `DS_E2E_BASE_URL`, `DS_E2E_EMAIL`, `DS_E2E_PASSWORD`, `DS_E2E_EMAIL_TO`, `DS_E2E_CONFIRM=yes`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (somente nomes), com 27 passos validados, envio em `sent_simulated` (não prova Resend real) e **sem cleanup** — o alvo preferencial é Preview isolado; (c) **Resend**: contrato de código conferido (admin-only, exige `approved` com 409, chave só no servidor, `sent` + `provider_message_id`, falha fechada em `provider_not_configured`), restando prova ambiental de `ds_settings.email_provider = resend` e de um envio real pelo fluxo do CRM; (d) **migrations**: a #14 adiciona apenas `20260917000000_add_order_coupon.sql`, já aplicada e verificada em Production (D-015/D-016), sem pendência exigida antes do E2E |
| motivo | resolver o máximo dos bloqueios externos sem merge, sem presumir estado de Production e sem repetir trabalho já concluído |
| fonte | auditoria local (PATH, ambiente, arquivos), leitura de `lib/e2e/plan.js`, `scripts/e2e-authenticated.mjs`, `app/api/email-send/route.ts`, `lib/email/provider.ts`, inventário de `*.sql` e bateria completa na PR #14 |
| commit | branch `codex/supervisor-dattaseller`, head `51499fe` (auditoria registrada em seguida) |
| caminho | `docs/SUPERVISOR_DATTASELLER.md` |
| componente | Vercel / E2E / Resend / migrations |
| cards afetados | Final Gate n. 4, DS-WEB-RESEND-001, OPS-COUPON-001 |
| responsável | operador humano para acesso Vercel, credenciais de E2E e configuração do provedor; Codex para a preparação |
| evidência | bateria no head atual: 78/78 testes, `tsc --noEmit` exit 0, `git diff --check` limpo, 0 segredos em 224 arquivos, `sync-dashboard` + `production-dashboard-patch` sem alteração de conteúdo, `next build` exit 0; comparação com a canônica: 30 arquivos, +2646/-7, sem preço/canal/catálogo inventado |
| condição de revisão | quando houver `vercel login`, `DS_E2E_*` e configuração de provedor, executar o E2E em Preview isolado e registrar a evidência passo a passo |

## D-031 — Modo fechamento total e auditoria do site público

| Campo | Valor |
| --- | --- |
| data | 2026-09-18 |
| assunto | encerrar o DattaSeller + fluxo Datta360 sem criar escopo novo |
| decisão | (a) entrar em modo fechamento: nenhuma feature, roadmap, evolução ou refactor cosmético; todo trabalho deve reduzir pendência de entrega. (b) Entregar o cleanup controlado do E2E (`lib/e2e/cleanup.js`, `scripts/e2e-cleanup.mjs`, 10 testes) e o documento `docs/FINAL-GATE-4-EVIDENCIA.md`. (c) Registrar a auditoria do site público em `docs/FINAL_ACCEPTANCE_DATTASELLER.md`, com `READY_FOR_MERGE: NO` enquanto houver FAIL ou BLOCKED crítico |
| motivo | instrução explícita do responsável ("MODO FECHAMENTO TOTAL") |
| fonte | instrução do responsável de 2026-09-18; auditoria HTTPS de `https://www.datta360.com.br`; leitura do bundle público, de `app/api/[...path]/route.ts`, do seed `ds_products` e do runner E2E |
| commit | branch `codex/supervisor-dattaseller` |
| caminho | `docs/FINAL_ACCEPTANCE_DATTASELLER.md`, `docs/FINAL-GATE-4-EVIDENCIA.md` |
| componente | site público / CRM / E2E / governança |
| cards afetados | Final Gate n. 4, DS-WEB-RESEND-001, OPS-COUPON-001 |
| responsável | Codex (execução); decisões comerciais e de integração continuam humanas |
| evidência | site 200 com HSTS mas **sem** CSP/X-Content-Type-Options/X-Frame-Options/Referrer-Policy/Permissions-Policy; `og:image` ausente; 7 imagens com alt; favicon presente; formulário com seis campos (`nome`, `empresa`, `telefone`, `site`, `instagram`, `email`, quatro obrigatórios) fazendo `POST /api/leads` no próprio domínio; intake implementado em `app/api/[...path]/route.ts` (`ds_leads`, listagem filtra `deleted_at is null`); claims de Google Business Profile/Instagram/TikTok sem integração no repositório e WhatsApp apenas como link `wa.me`; **COMERCIAL_CONFLICT** entre site (USD 80/108/120/150/474/490/790 e BRL 410/554/615/770/2427/2510/4045) e `ds_products` (datta360 1500 BRL one_time, dattavps 190, dattaseg 240, dattahost 45, `max_discount_pct 20`, `is_demo true`); regressão no head `d19f81c` com 88/88 testes, `tsc` exit 0, diff-check limpo, 0 segredos em 224 arquivos e build verde |
| condição de revisão | quando o operador decidir o catálogo único de preços, corrigir a copy dos canais e liberar acesso Vercel/E2E |

## D-032 — Headers de segurança do Preview comprovados por SHA e classificação do gate de sessão

| Campo | Valor |
| --- | --- |
| data | 2026-09-18 |
| assunto | fechar o item 2 do NEXT (comparação de headers do Preview por SHA) sem promover nada |
| decisão | (a) os seis headers definidos em `next.config.ts` são **realmente servidos** pelo Preview no commit `a19672e1ecaa48b28bc733b493408638850f784a` (deployment `v0-project-o9j2vii6b-datta-x.vercel.app`), em `/` e `/api/leads`, com e sem alias de branch: `Content-Security-Policy frame-ancestors 'none'`, `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security max-age=31536000; includeSubDomains`; `X-Powered-By` ausente; a classificação anterior de BLOCKED (302 da borda/SSO) fica **superada para o candidato**, e o FAIL de headers segue restrito ao site público; (b) o gate de sessão em runtime é `proxy.ts`: sem sessão, `GET /` e `GET /api/leads` respondem **307 → `/login`** (JSON `{"redirect":"/login","status":"307"}` com `Accept: application/json`), portanto o registro estático "401 sem sessão" é corrigido para "401 no handler, 307 no cliente sem sessão" — **CONFLITO_DE_EVIDÊNCIA** resolvido a favor do runtime; (c) rotas fora da barreira (`/login`, `/api/auth/logout`, `/api/inbound/*`) confirmadas: `GET /login` 200 HTML pt-BR, `POST /api/inbound/datta360` sem segredo 401 `unauthorized` (falha fechada), `GET /api/inbound/datta360` 405, e sem bypass o Preview responde 302 para `vercel.com/sso-api`; (d) o segredo de *Protection Bypass for Automation* apareceu no log local ao ser lido da API e **não** pôde ser rotacionado por API (`protectionBypass` rejeitado em `PATCH /v9|v10|v11/projects/:id`; o segredo é gerenciado pela Vercel, `isEnvVar: true`) — **ROTATION_REQUIRED** registrado como ação humana no dashboard, sem nenhum valor reproduzido em documento |
| motivo | o site público não prova nada sobre o candidato; era preciso provar o que o Preview realmente serve antes de tratar header como FAIL do produto, e classificar corretamente o comportamento de autenticação observado |
| fonte | deploy listing da Vercel com `meta.githubCommitSha`, HTTP direto no deployment (com e sem bypass) via `fetch` `redirect: manual`, leitura de `proxy.ts` e `next.config.ts` |
| commit | branch `codex/supervisor-dattaseller`, head `a19672e` |
| caminho | `docs/FINAL_ACCEPTANCE_DATTASELLER.md`, `docs/SUPERVISOR_DATTASELLER.md` |
| componente | Vercel / headers de segurança / gate de sessão do CRM |
| cards afetados | Final Gate n. 4, auditoria estática do CRM |
| responsável | Codex (execução); rotação do segredo de bypass é ação humana no dashboard |
| evidência | headers observados idênticos em `/` e `/api/leads` no URL do deployment e no alias de branch; `X-Powered-By` ausente; 307 → `/login` sem sessão; `POST /api/inbound/datta360` 401 falha fechada; sem bypass 302 para `vercel.com/sso-api`; suíte 100/100, `tsc --noEmit` exit 0, `git diff --check` limpo, 0 segredos em 230 arquivos no head `a19672e` |
| condição de revisão | quando o bypass for rotacionado no dashboard, ou se `next.config.ts`/`proxy.ts` mudarem, refazer a captura por SHA |

## D-033 — Promoção da correção de navegação do CRM para Production

| Campo | Valor |
| --- | --- |
| data | 2026-09-19 |
| assunto | `NAV-CANONICA-001` / PR #14 — promover o dashboard com fonte única de navegação e boot sem flash de POC |
| decisão | (a) a PR #14 foi **mesclada** em `hardening/phase-a-containment-clean` (merge `42be5fadaf903350f5afe8db4aed5c550a7355fb`, árvore `9f6d2f8099c3b557a8554afe49dafdcdbfe91d2c`, **idêntica** à do head validado `61d7ae3`); (b) o deployment `dpl_4bjALoZnbE5ZZdTehHCWxKYq8cks` (branch canônica) foi **promovido a Production** por `POST /v9/projects/{projectId}/promote/{deploymentId}` — a variante `/v10/` responde `422`, a `/v9/` responde `201`; (c) o domínio `crm.datta360.com.br` passou a servir esse deployment pela própria promoção (alias atualizado em `2026-09-19T04:18:36Z`), substituindo `dpl_5xavK2MWFXcN14D3QRzcjjNbLTyR` (sha `6563882`, branch `hardening/audited-production-fixes`); (d) `main` **não** foi usada como destino: é uma linha sem ancestral comum com a canônica (10 commits de docs/skill) e não continha o candidato; (e) as PRs #6, #10, #11, #12 e #13 foram fechadas como `SUPERSEDED_BY_14`, com prova por patch-id e verificação de que nenhum arquivo delas está ausente na canônica; (f) **rollback**: promover de volta o deployment anterior (`POST /v9/projects/{projectId}/promote/dpl_5xavK2MWFXcN14D3QRzcjjNbLTyR`) ou Instant Rollback no dashboard — o deployment anterior continua disponível |
| motivo | a regra de promoção passou a ser por entrega: a correção tinha testes, build, secret scan, CI e Preview verdes, E2E de navegação aprovado, rollback conhecido e nenhum blocker relacionado |
| fonte | `git rev-parse <sha>^{tree}` + `git diff --name-only 61d7ae3 42be5fa` (vazio), promoção via API oficial da Vercel, leitura de `targets.production` e do alias `crm.datta360.com.br`, evidência Playwright no alias de branch do Preview |
| commit | merge `42be5fa`; head validado `61d7ae3`; commits da correção `b949550` (navegação canônica única + boot sem flash) e `61d7ae3` (resíduo textual da POC) |
| caminho | `poc/dattaseller-local/app/dashboard.html`, `public/dashboard.html`, `scripts/sync-dashboard.mjs`, `scripts/production-dashboard-patch.mjs`, `test/dashboard-nav.test.js` |
| componente | dashboard do CRM (navegação/boot) / Vercel Production |
| cards afetados | `NAV-CANONICA-001`, Final Gate n. 4 (pré-requisito de promoção) |
| responsável | Codex (execução); confirmação visual autenticada no domínio real depende da sessão do operador (o admin E2E existe apenas no HML) |
| evidência | Playwright no Preview isolado (alias `v0-project-git-codex-supervisor-dattaseller-datta-x.vercel.app`): **13 itens canônicos idênticos** antes/depois da sincronização e após 5 s, 17 snapshots **sem nenhum** marcador de POC/DEMO, 13/13 views abrindo com conteúdo e 0 erros de console; artefato com **uma** definição de `nav()` (sem `nav=function`) e `NAV_CANONICO` de 13 itens; boot exibe "Sincronizando com o servidor" em vez de dado local; suíte **129/129**, `tsc --noEmit` exit 0, `secret-scan` 0 em 237 arquivos, `next build` exit 0, CI `SUCCESS` (push + pull_request) no head `61d7ae3`; Production: `/login` byte-idêntico (`sha256 05be0fe3eca3…`) ao build promovido e **diferente** do deployment anterior (`76f2b90b3069…`), com `/dashboard.html` e `/api/leads` sem sessão ainda respondendo **307 → `/login`** (gate preservado) |
| condição de revisão | reabrir se a navegação voltar a divergir, se o boot exibir dado local/POC, se os marcadores de demonstração reaparecerem, ou se a confirmação autenticada no domínio real (sessão do operador) apontar divergência |
