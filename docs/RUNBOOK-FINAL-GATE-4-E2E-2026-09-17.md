# Runbook — Final Gate n. 4 (E2E autenticado)

Data: 2026-09-17. Este runbook executável fecha o Final Gate n. 4 **sem** exigir
que ninguém monte a cadeia à mão. Ele também cobre o teste que faltava do
`DS-WEB-RESEND-001`: o envio real pelo **fluxo do sistema**, não só pelo
provedor.

## Pré-requisitos (todos externos a este repositório)

1. `DS_E2E_BASE_URL` — endereço do ambiente a testar. Para Production, só depois
   de identificar qual deployment serve `crm.datta360.com.br`
   (`docs/EVIDENCIA-PRODUCTION-DEPLOYMENT-2026-09-17.md`).
2. `DS_E2E_EMAIL` / `DS_E2E_PASSWORD` — usuário Supabase Auth com
   `ds_users.role = 'admin'`.
3. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — para o
   login montar a sessão exatamente como o CRM monta.
4. `DS_E2E_EMAIL_TO` — caixa controlada que recebe o e-mail do teste. Não pode
   terminar em `.invalid`.
5. `DS_E2E_CONFIRM=yes` — confirmação explícita. Sem isso o script **não
   executa nada**.
6. No ambiente testado: `email_provider = resend` e `RESEND_API_KEY` presente no
   servidor, para o passo de envio sair de `provider_not_configured`.

## Execução

```bash
DS_E2E_CONFIRM=yes \
DS_E2E_BASE_URL=https://<ambiente> \
DS_E2E_EMAIL=<admin> DS_E2E_PASSWORD=<senha> \
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave-publica> \
DS_E2E_EMAIL_TO=<caixa-controlada> \
npm run e2e:authenticated
```

Saída: uma linha por passo (`OK`, `FALHA`, `BLOCKED`, `SKIP`) e um resumo com
`passed`, `failed`, `blocked` e `skipped`. O código de saída é `0` apenas quando
não há falha **nem** bloqueio.

## A cadeia executada

Autenticação admin → prospecção pública controlada → deduplicação →
qualificação → diagnóstico de site → auditoria social → preview → editor →
comparador → proposta → renegociação (com prova de que preço acima do público é
recusado) → capa → rascunho de e-mail → edição → revisão/aprovação → **envio
pelo endpoint do CRM** → follow-up → timeline → pedido (com cupom quando há
desconto) → checkout → pagamento → contrato → minuta HTML → DOCX →
handoff → financeiro/comissão → reload/persistência.

A ordem está cravada em `lib/e2e/plan.js` e existe teste que falha se algum
passo for removido ou reordenado.

## O que o script prova e o que não prova

- Prova: cada passo responde pela API real, o envio sai pelo endpoint do CRM e
  o estado persiste depois de um novo `GET` no lead e na timeline.
- **Não prova** a entrega final (`delivered`) do e-mail: isso depende do webhook
  do provedor. O passo de envio considera sucesso quando o CRM registra
  `sent` com `provider_message_id`; `failed` aparece como **bloqueado**, com o
  motivo (`provider_not_configured` ou `provider_send_failed`).
- Não apaga nada: a linha web não expõe reset. O lead criado fica marcado como
  `e2e-<timestamp>` para ficar rastreável.

## Dados criados

Um lead `e2e-<runId>` com qualificação, diagnóstico, auditoria social, preview,
proposta (original e revisada), e-mail, pedido, checkout, pagamento, contrato e
handoff. Todos apontam para fontes `https://e2e-<runId>.example/`, que não
existem, justamente para não tocar em nenhum domínio real de cliente.
