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
