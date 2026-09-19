# Verificação independente de D-015 — migration do cupom em Production

Data: 2026-09-17. Objetivo: conferir no banco real o que o registro D-015
afirma ter aplicado, sem repetir a afirmação e sem alterar nada.

## Método

Consultas **somente leitura** pela Management API do Supabase
(`POST /v1/projects/vkvkzoulbljampcbxaim/database/query`), com o token já
existente em `.env.local` carregado em memória. Nenhum `UPDATE`, `INSERT`,
`DELETE`, DDL ou `db push` foi executado. O valor do token não foi impresso nem
gravado em arquivo.

## Resultados brutos

**Colunas de `public.ds_orders` — 17 colunas.** As três novas existem, com o
tipo e a nulidade esperados:

| coluna | tipo | nulável |
| --- | --- | --- |
| `public_price` | `numeric` | sim |
| `coupon_code` | `text` | sim |
| `coupon_status` | `text` | sim |

As 14 colunas anteriores permanecem iguais (`id`, `lead_slug`, `product_id`,
`offer_name`, `seller`, `base_price`, `negotiated_price`, `discount`, `cost`,
`margin`, `currency`, `commission_pct`, `status`, `created_at`).

**Contagens:**

```json
{"colunas":17,"constraints_ds_orders":5,"pedidos":0,"com_cupom":0,"com_public_price":0}
```

**Constraints do cupom — definições exatamente como registradas:**

```json
[{"conname":"ds_orders_coupon_status_check","definicao":"CHECK (((coupon_status IS NULL) OR (coupon_status = ANY (ARRAY['issued'::text, 'applied'::text, 'cancelled'::text]))))"},
 {"conname":"ds_orders_public_price_ceiling","definicao":"CHECK (((public_price IS NULL) OR (negotiated_price <= public_price)))"}]
```

**Violações da regra do teto:** `{"violacoes":0}`.

**Consistência de preços dos produtos** (relevante para o risco residual de
divergência entre o desconto do cupom e o campo `discount` do pedido):

```json
{"total":4,"sem_public_price":0,"sem_base_price":0,"public_difere_de_base":0}
```

Ou seja: os 4 produtos têm `public_price` e `base_price` preenchidos e iguais
entre si. Não existe, hoje, nenhum produto em que o desconto calculado contra o
preço público difira do desconto calculado contra o preço-base.

## Veredito

**CONFIRMADO.** Todos os números e definições registrados em D-015 conferem
com o estado atual de Production, e a regra do teto não tem violação em nenhuma
linha. Não há divergência a registrar entre a afirmação do executor e o estado
real do banco.

Limite desta verificação: ela confirma **estado**, não histórico. Não se afirma
por onde a mudança entrou, apenas que o resultado registrado está de fato
aplicado.

## Achado colateral de operação — Production não tem ledger de migrations

Consulta adicional, também somente leitura:

```sql
select to_regclass('supabase_migrations.schema_migrations') is not null as tabela_existe;
-- {"tabela_existe": false}
```

Não existe tabela de histórico de migrations no projeto de Production. As
migrations versionadas em `supabase/migrations/` e `db/migrations/` foram, ao
que tudo indica, aplicadas à mão, uma a uma, sem registro no banco. Consequência
prática: um `supabase db push` futuro tentaria reaplicar todo o conjunto, e o
resultado dependeria de cada script ser idempotente — o que **não** foi
auditado. Isso é risco operacional (não é um defeito de código) e entra como
próxima entrega candidata: auditar a idempotência do conjunto de migrations e
definir o registro baseline.
