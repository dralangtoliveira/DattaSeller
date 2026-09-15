# Reconciliação Prospector → DattaSeller

## Implementado e validado localmente

- Prospecção assistida autenticada, limitada e sem scraper/provider novo.
- Deduplicação por telefone, e-mail, domínio, Instagram e nome+cidade.
- Evidências públicas, normalizações e TikTok preparados em migration local.
- Qualificação, diagnóstico, preview/editor, comparador, auditoria social e
  proposta versionada preservados no CRM; proposta recebe os artefatos do lead.
- Navegação de produção expõe Prospecção, Inteligência, Sites/Preview e Comparador.

## Evidências

- commits `bb0ff2b` até `a0aa823`;
- `npm test`: 35 testes aprovados;
- `npm run build`: TypeScript e dashboard de produção aprovados;
- migration `20260915212624_add_prospector_reconciliation.sql`: criada, não aplicada.

## Ainda não comprovado

Não houve aplicação de migration, deploy ou E2E em Supabase/Preview, por decisão
expressa de não tocar em Production. A validação controlada seguinte deve usar
um ambiente Supabase não produtivo com a migration aplicada e uma sessão admin.
