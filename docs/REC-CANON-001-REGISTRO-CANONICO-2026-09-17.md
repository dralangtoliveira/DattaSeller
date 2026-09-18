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
