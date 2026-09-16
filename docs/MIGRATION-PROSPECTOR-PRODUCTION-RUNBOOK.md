# Runbook — migration Prospector em Production

Migration candidata: `20260915212624_add_prospector_reconciliation.sql`.

## Regra de execução

Esta migration só pode ser aplicada em Production depois de todos os gates deste
documento. A autorização para revisar ou aplicar não remove esse controle. Não
executar junto com deploy, merge, importação de lead, disparo de e-mail ou outra
mudança comercial.

## Estado da auditoria e execução em 15–16/09/2026

- Projeto auditado: `vkvkzoulbljampcbxaim` (DattaSeller Production).
- A auditoria inicial encontrou zero grupos duplicados de e-mail e um grupo de
  telefone ativo, após normalização.
- O grupo de telefone era composto exclusivamente pelos testes
  `teste-integracao-dcb95d4171` e `teste-integracao-final-f8d6029576`; ambos
  foram confirmados sem pedido pago e receberam soft-delete em
  16/09/2026 01:16 UTC. O histórico foi preservado.
- A verificação posterior retornou zero grupos duplicados de telefone e e-mail.
- A migration foi aplicada no SQL Editor do projeto indicado, após os gates.
- Pós-verificação: 12 colunas e 5 índices esperados presentes.

Ela foi executada diretamente no SQL Editor; portanto, não houve registro
automático adicional no histórico de migrations do CLI. O arquivo versionado no
repositório continua sendo a fonte de verdade do SQL aplicado.

## Impacto técnico revisado

`ds_leads` recebe: `region`, `search_radius_km`, `target_quantity`,
`search_limit`, `tiktok_url`, `phone_normalized`, `email_normalized`,
`domain_normalized`, `instagram_normalized`, `name_city_normalized` e
`contact_evidence` (JSONB, não nulo, padrão `[]`).

`ds_proposals` recebe `artifacts` (JSONB, não nulo, padrão `{}`).

A migration cria índices únicos parciais para `phone_normalized` e
`email_normalized` em leads não excluídos e índices comuns para domínio,
Instagram e nome+cidade. Ela não cria tabelas, policies/RLS, funções ou
triggers; não contém `DELETE`, `UPDATE`, `DROP` nem backfill. A criação de
índices não usa `CONCURRENTLY`, portanto deve ocorrer em janela de baixa escrita.

## Gates obrigatórios

### 1. Identificar a duplicidade sem expor contato

Executar no SQL Editor, obtendo somente `slug`:

```sql
with normalized as (
  select slug,
         regexp_replace(coalesce(nullif(telefone, ''), nullif(whatsapp, '')),
                        '\\D', '', 'g') as value
  from public.ds_leads
  where deleted_at is null
), collisions as (
  select value
  from normalized
  where value <> ''
  group by value
  having count(*) > 1
)
select normalized.slug
from normalized
join collisions using (value)
order by normalized.slug;
```

Revisar os dois registros no CRM. A ação deve ser registrada como uma destas:
consolidar em um lead, marcar um como duplicado/soft-delete quando permitido, ou
declarar exceção documentada. Não apagar nem alterar telefone por SQL direto.

### 2. Reexecutar a verificação agregada

O resultado exigido é `0` para ambas as colunas:

```sql
with phones as (
  select regexp_replace(coalesce(nullif(telefone, ''), nullif(whatsapp, '')),
                        '\\D', '', 'g') as value
  from public.ds_leads where deleted_at is null
), emails as (
  select lower(trim(email)) as value
  from public.ds_leads where deleted_at is null
)
select
  (select count(*) from (
    select value from phones where value <> '' group by value having count(*) > 1
  ) p) as phone_duplicate_groups,
  (select count(*) from (
    select value from emails where value <> '' group by value having count(*) > 1
  ) e) as email_duplicate_groups;
```

### 3. Aplicar a migration

Em janela de baixa escrita, executar exatamente o conteúdo do arquivo de
migration do repositório. Não editar o SQL no editor. Confirmar que o projeto
selecionado é `vkvkzoulbljampcbxaim` antes de clicar em **Run**.

### 4. Verificação pós-migration

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'ds_leads' and column_name in (
      'region','search_radius_km','target_quantity','search_limit','tiktok_url',
      'phone_normalized','email_normalized','domain_normalized',
      'instagram_normalized','name_city_normalized','contact_evidence'
    ))
    or (table_name = 'ds_proposals' and column_name = 'artifacts')
  )
order by table_name, column_name;

select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'ds_leads_phone_normalized_unique',
    'ds_leads_email_normalized_unique',
    'ds_leads_domain_normalized_idx',
    'ds_leads_instagram_normalized_idx',
    'ds_leads_name_city_normalized_idx'
  )
order by indexname;
```

Resultado esperado: 12 linhas de colunas e 5 linhas de índices. Em seguida,
executar `npm test`, `npm run build` e um fluxo autenticado não comercial de
criação/consulta de preview; não usar contato externo.

## Rollback

O rollback estrutural só é aceitável imediatamente, antes de qualquer gravação
nos campos novos e após confirmar backup/snapshot válido. Depois que dados forem
gravados, remover as colunas perderia evidências e artefatos; nesse cenário o
rollback é uma migration corretiva, não `DROP COLUMN`.

```sql
drop index if exists public.ds_leads_phone_normalized_unique;
drop index if exists public.ds_leads_email_normalized_unique;
drop index if exists public.ds_leads_domain_normalized_idx;
drop index if exists public.ds_leads_instagram_normalized_idx;
drop index if exists public.ds_leads_name_city_normalized_idx;
alter table public.ds_proposals drop column if exists artifacts;
alter table public.ds_leads
  drop column if exists region,
  drop column if exists search_radius_km,
  drop column if exists target_quantity,
  drop column if exists search_limit,
  drop column if exists tiktok_url,
  drop column if exists phone_normalized,
  drop column if exists email_normalized,
  drop column if exists domain_normalized,
  drop column if exists instagram_normalized,
  drop column if exists name_city_normalized,
  drop column if exists contact_evidence;
```

Esse SQL de rollback não deve ser usado sem revisão humana específica.
