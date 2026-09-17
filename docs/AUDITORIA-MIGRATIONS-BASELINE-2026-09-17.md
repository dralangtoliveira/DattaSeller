# Auditoria das migrations e baseline de Production — 2026-09-17

Origem: a verificação da migration do cupom (D-016) mostrou que o projeto de
Production **não tem ledger de migrations** (D-020). Esta auditoria responde à
pergunta seguinte: o que exatamente existe hoje, o que é seguro reaplicar e o
que seria necessário para ter um registro.

## 1. Duas linhagens de SQL no repositório

| Linhagem | Caminho | É lida pelo Supabase CLI? | Está em Production? |
| --- | --- | --- | --- |
| Linha web (CRM) | `supabase/migrations/*.sql` | sim (`[db.migrations] enabled = true`) | **sim** |
| Linha local/POC | `db/migrations/*.sql`, `db/verification/*.sql` | não (fora de `supabase/`) | **não** |

O levantamento read-only do schema de Production lista exatamente as 20 tabelas
da linha web, sem nenhuma tabela da linha local (`leads`, `users`,
`recommendations`, `recommendation_feedback` não existem):

```
ds_checkouts, ds_commissions, ds_contracts, ds_emails, ds_followups,
ds_handoffs, ds_inbound_events, ds_lead_events, ds_leads, ds_orders,
ds_payments, ds_previews, ds_products, ds_proposals, ds_qualifications,
ds_settings, ds_site_diagnoses, ds_social_audits, ds_timeline, ds_users
```

Conclusão parcial: as duas linhagens estão separadas por caminho e por estado
real. A linhagem local não vazou para Production.

## 2. Guarda de reaplicação por arquivo

Contagem por arquivo (regex sobre o texto, sem executar nada):

| Arquivo | `create table` sem guarda | `create index` sem guarda | `add column if not exists` | Reaplicável? |
| --- | --- | --- | --- | --- |
| `20260914031102_dattaseller_web_schema.sql` | **20** | **1** | 0 | **não** |
| `20260915000000_phase_a_containment.sql` | 0 | 0 | 4 | sim (guarda em tudo; `drop index if exists`) |
| `20260915212624_add_prospector_reconciliation.sql` | 0 | 0 | 12 | sim |
| `20260917000000_add_order_coupon.sql` (PR #10 / RC) | 0 | 0 | 3 | sim (`do $$` + `pg_constraint`) |

O schema base é o único não reaplicável: uma segunda execução falharia em
`create table public.ds_users`. Falhar é o comportamento seguro (a migration
roda em transação), mas significa que `supabase db push` contra Production não
é uma operação utilizável hoje — nem para aplicar novidades, porque o CLI
tentaria o conjunto a partir do zero.

## 3. Lacuna de seed

`supabase/config.toml` declara `[db.seed] enabled = true` com
`sql_paths = ["./seed.sql"]`, mas **`supabase/seed.sql` não existe**. Qualquer
`supabase db reset` local depende desse arquivo. Não é risco de Production —
é higiene de ambiente local — e a correção exige uma decisão (criar o seed ou
desligar a opção), não um palpite.

## 4. Procedimento seguro enquanto não há ledger

1. **Não** rodar `supabase db push` contra Production.
2. Aplicar mudança de schema como SQL pontual, com autorização expressa, do
   mesmo modo que a migration do cupom foi aplicada (D-015), e registrar a
   evidência read-only depois (D-016).
3. Se for adotado um ledger, o passo é uma **escrita** em Production
   (backfill de `supabase_migrations.schema_migrations`) e por isso depende de
   autorização humana; o baseline acima é a fonte para esse backfill.

## 5. Evidência

- Lista de tabelas de Production: consulta read-only a
  `information_schema.tables` (Management API).
- Ausência do ledger:
  `select to_regclass('supabase_migrations.schema_migrations') is not null` →
  `false`.
- Contagens de guarda: regex local sobre os arquivos de `supabase/migrations/`.
