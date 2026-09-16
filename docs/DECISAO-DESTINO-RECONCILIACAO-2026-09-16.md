# Decisão de destino — Reconciliação Prospector → DattaSeller

**Decisão registrada em 2026-09-16:** a branch canônica da reconciliação é
`prospector/reconciliation`.

## Base e isolamento

- A base obrigatória de contenção é `hardening/phase-a-containment-clean`, no
  commit `04adeb6`.
- `prospector/reconciliation` descende diretamente dessa base e contém os
  commits de reconciliação Prospector; ela é o único destino para novas
  alterações desse escopo.
- `hardening/audited-production-fixes` permanece uma referência de Fase A e
  não deve receber commits do Prospector.

## Branches explicitamente excluídas

- `main` não é alvo: não compartilha ancestral com o CRM/Supabase atual.
- `fix/production-crm-ui` não é alvo: não contém o commit fail-closed
  `04adeb6` e já carrega merges históricos.
- Checkpoints locais paralelos não são fonte canônica quando divergirem da
  implementação validada em `prospector/reconciliation`.

## Forma de integração futura

Qualquer PR de reconciliação deve ter:

- **head:** `prospector/reconciliation`;
- **base:** `hardening/phase-a-containment-clean`;
- escopo limitado aos commits posteriores a `04adeb6`;
- status draft até revisão e autorização humana.

Esta decisão não autoriza merge, deploy, aplicação de migration ou alteração
no Supabase Production.
