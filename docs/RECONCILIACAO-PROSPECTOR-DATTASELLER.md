# Reconciliação Prospector → DattaSeller

## Implementado e validado localmente

- Prospecção assistida autenticada, limitada e sem scraper/provider novo.
- Deduplicação por telefone, e-mail, domínio, Instagram e nome+cidade.
- Evidências públicas, normalizações e TikTok com schema aplicado e validado em
  Production.
- Qualificação, diagnóstico, preview/editor, comparador, auditoria social e
  proposta versionada preservados no CRM; proposta recebe os artefatos do lead.
- Navegação de produção expõe Prospecção, Inteligência, Sites/Preview e Comparador.

## Evidências

- commits `bb0ff2b` até `a0aa823`;
- `npm test`: 35 testes aprovados;
- `npm run build`: TypeScript e dashboard de produção aprovados;
- migration `20260915212624_add_prospector_reconciliation.sql`: aplicada e
  validada em Production em 16/09/2026 (12 colunas e 5 índices conferidos).

## Ainda não comprovado

Não houve deploy ou E2E autenticado em Supabase/Preview. A migration foi
aplicada em Production após auditoria de duplicidades, com 12 colunas e 5
índices conferidos. A validação controlada seguinte exige sessão admin e não
autoriza contato externo ou publicação.
