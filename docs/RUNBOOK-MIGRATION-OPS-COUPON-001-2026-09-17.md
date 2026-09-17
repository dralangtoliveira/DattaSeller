# Runbook — migration do cupom (`OPS-COUPON-001`)

Data: 2026-09-17. Migration candidata:
`supabase/migrations/20260917000000_add_order_coupon.sql`.

Seguem as mesmas regras de execução do runbook anterior
(`MIGRATION-PROSPECTOR-PRODUCTION-RUNBOOK.md`): aplicar **isolado**, sem deploy,
sem merge, sem importação de lead, sem disparo de e-mail e sem outra mudança
comercial no mesmo momento. A autorização para revisar não é autorização para
aplicar.

## Projeto Supabase alvo

`vkvkzoulbljampcbxaim` — identificado como o projeto Supabase de **Production do
DattaSeller** em duas evidências do próprio repositório:
`docs/MIGRATION-PROSPECTOR-PRODUCTION-RUNBOOK.md` ("Projeto auditado:
`vkvkzoulbljampcbxaim` (DattaSeller Production)") e `docs/WEBHOOK_E2E_EVIDENCE.md`
("O runtime de produção do DattaSeller recebeu a secret key dedicada do projeto
Supabase `vkvkzoulbljampcbxaim`").

Este runbook **não** confirma o ref por leitura da variável `NEXT_PUBLIC_SUPABASE_URL`
(valor criptografado na Vercel, não decifrado e não registrado). A confirmação
final do alvo é do operador, no painel do Supabase, antes de executar o SQL.

## 1. Pré-condições

- [ ] autorização explícita do responsável para aplicar;
- [ ] Release Candidate `207a870` aprovado (a migration existe para ele);
- [ ] nenhuma outra migration, deploy ou mudança comercial em andamento;
- [ ] snapshot do schema atual coletado (item 2) e salvo como evidência.

## 2. Snapshot anterior (baseline de rollback)

Executar e guardar a saída **antes** de aplicar:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'ds_orders'
order by ordinal_position;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.ds_orders'::regclass;

select count(*) as pedidos from public.ds_orders;
```

Esperado no estado atual: nenhuma das três colunas novas
(`public_price`, `coupon_code`, `coupon_status`) e nenhum dos dois checks
(`ds_orders_coupon_status_check`, `ds_orders_public_price_ceiling`).

## 3. Operações da migration

1. `alter table public.ds_orders add column if not exists public_price numeric, coupon_code text, coupon_status text;`
2. `add constraint ds_orders_coupon_status_check` — `coupon_status is null or coupon_status in ('issued','applied','cancelled')`.
3. `add constraint ds_orders_public_price_ceiling` — `public_price is null or negotiated_price <= public_price`.

As duas constraints são protegidas por `if not exists` (migration idempotente) e
ambos os predicados começam com `is null or`, portanto **a validação das linhas
existentes passa**: as linhas antigas têm `public_price` e `coupon_status`
nulos.

## 4. Aplicação

Aplicar o arquivo exatamente como está, pelo mesmo mecanismo usado na migration
`20260915212624_add_prospector_reconciliation.sql`, documentado em
`MIGRATION-PROSPECTOR-PRODUCTION-RUNBOOK.md`. Não editar o SQL durante a
aplicação.

## 5. Validação pós-migration

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'ds_orders'
  and column_name in ('public_price', 'coupon_code', 'coupon_status')
order by column_name;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.ds_orders'::regclass
  and conname in ('ds_orders_coupon_status_check', 'ds_orders_public_price_ceiling');

select count(*) as pedidos from public.ds_orders;
select count(*) as linhas_incompativeis from public.ds_orders
where (public_price is not null and negotiated_price > public_price)
   or (coupon_status is not null and coupon_status not in ('issued','applied','cancelled'));
```

Critério de sucesso: 3 colunas presentes, 2 constraints presentes, contagem de
pedidos **igual** à do snapshot e `linhas_incompativeis = 0`.

## 6. Rollback

```sql
alter table public.ds_orders
  drop constraint if exists ds_orders_public_price_ceiling,
  drop constraint if exists ds_orders_coupon_status_check;

alter table public.ds_orders
  drop column if exists public_price,
  drop column if exists coupon_code,
  drop column if exists coupon_status;
```

Migration 100% aditiva: o rollback não perde dados históricos. A única perda
possível é o preenchimento de cupom/preço público gravado depois da aplicação.

## 7. Consequência de não aplicar

O Release Candidate `207a870` grava `public_price`, `coupon_code` e
`coupon_status` ao criar pedido. Sem as colunas, `POST /api/orders` falha e o
E2E não passa de pedido/checkout/pagamento — ou seja, o Final Gate n. 4 não
fecha.

## 8. Compatibilidade com o app atual de Production (`6563882`)

O app em Production hoje não referencia as colunas novas: continuaria criando
pedidos normalmente (colunas ficam nulas) e apenas receberia campos extras em
leituras. Não há coluna obrigatória, rename ou remoção.

## 9. Ordem correta a partir daqui

1. autorização para aplicar;
2. aplicar (item 4) e validar (item 5), guardando as saídas como evidência;
3. somente então executar o E2E autenticado no Preview;
4. registrar tudo no Registro Canônico antes de qualquer conversa sobre
   Production.

## 10. Evidência da aplicação — 2026-09-17

Aplicação executada pela **Management API do Supabase** (`POST /v1/projects/<ref>/database/query`).
Não foi usado `supabase db push`, nenhuma outra migration foi aplicada e nenhum
SQL fora deste runbook foi executado.

### Projeto confirmado

| Campo | Valor |
| --- | --- |
| project ref | `vkvkzoulbljampcbxaim` |
| nome | **DattaSeller** |
| organization | `vercel_icfg_D06arwCZ1aVDFEX08W1VGslP` |
| region | `sa-east-1` |
| status | `ACTIVE_HEALTHY` |
| observação | é o **único** projeto visível ao token usado, portanto não houve risco de aplicar no projeto errado |

### Baseline (antes)

- **colunas de `public.ds_orders` — 14**: `id`, `lead_slug`, `product_id`, `offer_name`, `seller`, `base_price`, `negotiated_price`, `discount`, `cost`, `margin`, `currency`, `commission_pct`, `status`, `created_at`;
- **constraints — 3**: `ds_orders_pkey`, `ds_orders_lead_slug_fkey`, `ds_orders_product_id_fkey`;
- **contagem**: `pedidos = 0` (tabela vazia, então a validação dos novos checks não tinha linhas a percorrer).

### SQL aplicado

- arquivo: `supabase/migrations/20260917000000_add_order_coupon.sql`;
- blob do commit do RC: `54852562cfaca9b23467222de70733b2d40d71ee` (RC `207a870`);
- SHA-256 do conteúdo: `16c847fc5e95e447906bbc60e43c0969eb3e3a0673b45e68cfb38f4328f95a0e`;
- 989 bytes, exatamente o conteúdo versionado — sem edição durante a aplicação.

### Schema depois

- **colunas — 17** (14 originais preservadas + 3 novas), todas as novas anuláveis:
  `coupon_code text`, `coupon_status text`, `public_price numeric`;
- **constraints — 5** (3 originais preservadas + 2 novas):
  - `ds_orders_coupon_status_check`: `CHECK (coupon_status IS NULL OR coupon_status = ANY (ARRAY['issued','applied','cancelled']))`;
  - `ds_orders_public_price_ceiling`: `CHECK (public_price IS NULL OR negotiated_price <= public_price)`.

### Validação

| Verificação | Resultado |
| --- | --- |
| `coupon_code`, `coupon_status`, `public_price` existem | ✅ 3 de 3, `is_nullable = YES` |
| os dois constraints existem | ✅ 2 de 2, com a definição esperada |
| nenhuma coluna removida | ✅ 14 → 17 (só adição) |
| nenhum constraint removido | ✅ 3 → 5 (só adição) |
| contagem de registros | ✅ `pedidos = 0` antes e depois |
| leitura segura de `ds_orders` | ✅ `select` das colunas novas executado sem erro |
| linhas incompatíveis com os checks | ✅ `0` |
| dados existentes alterados | ❌ nenhum (nenhum `update`/`insert`/`delete`) |

### Rollback

Permanece **válido e não exercido**: a migration é aditiva e o rollback
documentado (seção 6) continua aplicável. Como não havia pedidos, não há
nenhuma linha a preservar nem preenchimento de cupom a perder.

### Compatibilidade

O app em Production hoje (`6563882`) não referencia as colunas novas: continua
criando pedidos normalmente (as novas colunas ficam nulas) e apenas recebe
campos extras em leituras. Nenhuma coluna obrigatória, rename ou remoção.

### Próximo bloqueio para o E2E

1. `RESEND_API_KEY` no alvo **preview** da Vercel (hoje só existe em `production`);
2. `email_provider = resend` em `ds_settings` — **não autorizado nesta etapa**; o seed grava `mock` e, com `mock`, o passo de envio não faz envio real e o harness reprova o passo;
3. credenciais locais `DS_E2E_CONFIRM`, `DS_E2E_BASE_URL`, `DS_E2E_EMAIL`, `DS_E2E_PASSWORD`, `DS_E2E_EMAIL_TO`.
