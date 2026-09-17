# Evidência OPS-EMAIL-001 e OPS-CONTRATO-001 — follow-up e DOCX do contrato

Data: 2026-09-16. Escopo: fechamento das pendências de e-mail e contrato na
linha web (Next/Supabase). Sem merge, sem deploy de Production, sem migration
nova e sem contato externo.

## O que estava incompleto

1. A tabela `ds_followups` existia no schema desde
   `20260914031102_dattaseller_web_schema.sql`, mas nenhuma rota a usava: o
   fluxo de e-mail parava em `no_reply` e não havia follow-up real.
2. Um e-mail com status `failed` ficava preso — `PUT /api/emails/:id` só
   aceitava `draft` e `reviewed`, então não havia correção nem reenvio.
3. O botão "baixar DOCX" da tela de contratos apontava para
   `/api/contracts/:id/docx`, que não existia na linha web: a requisição caía
   no handler genérico de tabelas e devolvia JSON em vez do documento.

## O que foi entregue

**OPS-EMAIL-001 — follow-up.** `POST /api/emails/:id/follow-up` cria um novo
rascunho vinculado ao envio original e registra o agendamento em
`ds_followups`, com prazo vindo de `settings.followup_days`
(`lib/email/follow-up.js`). O follow-up não envia sozinho: ele entra no mesmo
caminho rascunho → revisão → aprovação → envio.

- só é agendado depois de um desfecho conhecido — `sent`,
  `delivered_simulated`, `no_reply` ou `generic_reply`; qualquer outro estado
  recebe `follow_up_requires_sent_email` (409);
- é idempotente por envio: existindo um follow-up `scheduled`, a rota devolve o
  registro existente em vez de duplicar;
- falha fechada: se o registro do agendamento falhar, o rascunho criado é
  removido e a resposta é `storage_unavailable` (503);
- o evento `email.follow_up.scheduled` entra na timeline do lead;
- o dashboard publicado ganha o botão "Criar follow-up" na Central de e-mail.

**OPS-EMAIL-001 — retry.** Editar um e-mail `failed` agora é permitido: a
edição rebaixa o registro para `draft` e limpa o erro, invalidando a aprovação
anterior. O reenvio exige nova aprovação humana.

**OPS-CONTRATO-001 — DOCX.** `GET /api/contracts/:id/docx` gera o pacote DOCX
(OOXML) em Node puro (`lib/contracts/docx.js`), sem dependência nova, a partir
do pedido, do lead e das condições do produto — o mesmo conteúdo da minuta
HTML. A resposta usa `Content-Type` de documento Word e
`Content-Disposition: attachment`. Produto demo continua bloqueado
(`demo_product_contract_forbidden`), com a mesma regra do POST que gera a
minuta. Os estados de contrato seguem em
`generated → sent_simulated → signed | refused | cancelled`.

## Como foi verificado

- `npm test` (`node --experimental-strip-types --test`): **55 testes, 55
  passando, 0 falhando**; os dois arquivos de teste restaurados
  (`test/commission.test.js`, `test/paid-handoff.test.js`) passam em execução
  dedicada com 4 testes.
- `node node_modules/typescript/bin/tsc --noEmit`: limpo (exit 0).
- `node node_modules/next/dist/bin/next build`: build de produção concluído
  com as rotas `/api/[...path]`, `/api/auth/logout`, `/api/email-send` e
  `/api/inbound/datta360`.
- DOCX conferido por ferramenta externa: `Expand-Archive` extraiu as três
  partes esperadas (`[Content_Types].xml`, `_rels/.rels`,
  `word/document.xml`) e um parser XML independente leu
  `word/document.xml` (raiz `document`, 11 parágrafos) e `[Content_Types].xml`.
- A cadeia de prebuild (`scripts/sync-dashboard.mjs` +
  `scripts/production-dashboard-patch.mjs`) mantém o follow-up no
  `public/dashboard.html` gerado.

## Dependência externa remanescente

- `DS-WEB-RESEND-001` continua bloqueado fora do código: verificação do
  domínio/remetente no Resend e uma remessa real controlada. A rota falha
  fechada (`provider_not_configured`) enquanto `RESEND_API_KEY` não existir.
- Nenhuma migration nova foi necessária: `ds_followups` já está no schema
  aplicado.
- O E2E autenticado completo (Final Gate nº 4) depende de Supabase/Vercel
  acessíveis e de um remetente verificado.

## Pendência de decisão registrada

Os seis caminhos removidos na árvore de trabalho foram restaurados para o
estado do HEAD desta evidência (`docs/11-comissoes.md`,
`docs/12-handoff-pago.md`, `src/commissions/commission.js`,
`src/integrations/paid-handoff.js`, `test/commission.test.js`,
`test/paid-handoff.test.js`). A regra de comissão e o handoff pago seguem
implementados dentro de `app/api/[...path]/route.ts`; nenhum arquivo importa os
dois módulos. A remoção definitiva precisa de decisão explícita, porque não há
commit que registre essa intenção.
