# DS-SEC-03/04 — hardening de funções privilegiadas

Data: 2026-09-22  
Estado: **VERSIONADO / AGUARDANDO PROVA HML**

## Evidência observada

Em Production (`vkvkzoulbljampcbxaim`), `public.rls_auto_enable()` foi confirmado como `SECURITY DEFINER`, com `search_path=pg_catalog`, ligado ao event trigger ativo `ensure_rls` em `ddl_command_end`. O privilégio EXECUTE estava concedido a `PUBLIC`.

A migration histórica `db/migrations/002_lead_identity.sql` criava `upsert_lead_identity` sem `search_path` fixo. O Security Advisor do HML já havia sinalizado `function_search_path_mutable`.

## Correção versionada

`supabase/migrations/20260922164000_security_function_hardening.sql`:

- mantém `rls_auto_enable()` e o event trigger;
- revoga apenas EXECUTE direto de `PUBLIC`, `anon` e `authenticated`;
- fixa `search_path` de `upsert_lead_identity` em `pg_catalog, public`;
- não altera dados, tabelas, RLS, policies ou regras comerciais.

`db/migrations/002_lead_identity.sql` também passa a criar a função com `search_path` fixo em instalações novas.

## Bloqueio atual

O HML DattaSeller `qfwvkarvueuezeqfljbl` está `INACTIVE`. A tentativa de restore em 2026-09-22 foi recusada pelo Supabase porque o administrador atingiu o limite de 2 projetos Free ativos. Nenhum outro HML e nenhuma Production foram pausados para liberar vaga.

Portanto a migration **não foi aplicada em Production**. Próxima prova obrigatória: restaurar o HML sem deslocar outro projeto necessário, aplicar a migration, validar event trigger + ACL + `proconfig`, executar regressão e só então considerar aplicação equivalente em Production.
