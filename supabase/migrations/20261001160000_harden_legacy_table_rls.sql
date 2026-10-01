-- Fecha a exposição das tabelas legadas do núcleo comercial (`db/migrations/001`).
--
-- Elas recebiam `grant ... to authenticated` sem RLS, então qualquer sessão
-- autenticada alcançava linhas de qualquer tenant via PostgREST. Nenhuma rota
-- web do DattaSeller as usa (o CRM opera exclusivamente em `ds_*`), então a
-- proteção passa a ser a mesma das demais: RLS ligada + policy de admin.
--
-- Idempotente: reexecutar não altera o resultado. Reversível: desligar RLS e
-- remover a policy devolve o estado anterior.
do $$
declare
  tabela text;
  legadas text[] := array[
    'activities', 'audit_events', 'commissions', 'companies', 'delivery_orders',
    'integration_attempts', 'lead_sources', 'leads', 'opportunities', 'orders',
    'payments', 'product_plans', 'products', 'recommendation_feedback',
    'recommendations', 'sales', 'users'
  ];
begin
  foreach tabela in array legadas loop
    continue when to_regclass(format('public.%I', tabela)) is null;
    execute format('alter table public.%I enable row level security', tabela);
    execute format('drop policy if exists "admins manage %1$s" on public.%1$I', tabela);
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated '
      'using (exists (select 1 from public.ds_users u where u.id = (select auth.uid()) and u.role = ''admin'')) '
      'with check (exists (select 1 from public.ds_users u where u.id = (select auth.uid()) and u.role = ''admin''))',
      tabela
    );
  end loop;
end $$;

revoke all on table public.activities, public.audit_events, public.commissions, public.companies,
  public.delivery_orders, public.integration_attempts, public.lead_sources, public.leads,
  public.opportunities, public.orders, public.payments, public.product_plans, public.products,
  public.recommendation_feedback, public.recommendations, public.sales, public.users
  from anon;
