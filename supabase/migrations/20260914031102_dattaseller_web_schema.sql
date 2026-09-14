-- DattaSeller web: espelho semântico do núcleo SQLite local.
-- Não há grants para anon: toda entrada pública passa pelo endpoint servidor.

create extension if not exists pgcrypto with schema extensions;

create table public.ds_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table public.ds_leads (
  slug text primary key,
  nome text, empresa text, nicho text, cidade text, nota numeric, avaliacoes integer,
  email text, telefone text, whatsapp text, site_antigo text, instagram_url text,
  motivo text, status text not null default 'novo', url_nova text, data_proposta timestamptz,
  valor numeric, obs text, contrato_status text not null default 'pendente', contrato_em timestamptz,
  manutencao numeric, pago boolean not null default false, doc_cliente text, end_cliente text,
  source text not null default 'manual', source_url text, source_checked_at timestamptz,
  public_contact_type text, product_suggested text, product_reason text, next_action text,
  delivery_status text, checkout_url text, checkout_presented_at timestamptz,
  checkout_clicked_at timestamptz, qualification_json jsonb, site_audit_json jsonb,
  instagram_audit_json jsonb, valor_fechado numeric, closing_confirmed_at timestamptz,
  message text, referrer text, utm_source text, utm_medium text, utm_campaign text,
  utm_content text, utm_term text, consents jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index ds_leads_email_normalized_idx on public.ds_leads (lower(email)) where email is not null and email <> '';
create index ds_leads_phone_idx on public.ds_leads (telefone) where telefone is not null and telefone <> '';

create table public.ds_lead_events (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  source text not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.ds_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table public.ds_products (
  id text primary key, name text not null, billing text not null, public_price numeric not null,
  base_price numeric not null, cost numeric not null, commission_pct numeric not null default 0,
  max_discount_pct numeric not null default 0, currency text not null default 'BRL', active boolean not null default true,
  adapter text not null, is_demo boolean not null default true, terms text not null default '',
  description text not null default '', checkout_url text not null default '', cta_label text not null default '',
  availability text not null default 'available', updated_at timestamptz not null default now()
);
create table public.ds_timeline (
  id text primary key, lead_slug text references public.ds_leads(slug) on delete set null,
  event text not null, detail text, created_at timestamptz not null default now(), is_demo boolean not null default false
);
create table public.ds_qualifications (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  facts jsonb not null, hypotheses jsonb not null, recommendation text not null, reason text not null,
  confidence text not null, validation_question text, next_action text, owner text, created_at timestamptz not null default now()
);
create table public.ds_site_diagnoses (id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade, criteria jsonb not null, created_at timestamptz not null default now());
create table public.ds_social_audits (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok')), url text, username text, bio text, cta text,
  link text, visual_identity text, consistency_note text, frequency_note text, factual_notes text,
  recommendation text, creative_direction text, evidence text, created_at timestamptz not null default now()
);
create table public.ds_previews (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  kind text not null, url text not null, content text not null, status text not null, created_at timestamptz not null default now()
);
create table public.ds_proposals (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  product_id text not null references public.ds_products(id), base_price numeric not null, negotiated_price numeric not null,
  discount numeric not null, margin numeric not null, currency text not null, terms text, valid_until timestamptz,
  version integer not null, status text not null, created_at timestamptz not null default now()
);
create table public.ds_emails (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  proposal_id text references public.ds_proposals(id) on delete set null, sender text, recipient text, reply_to text,
  subject text not null, body text not null, template text, status text not null, attempt integer not null default 0,
  provider text not null default 'mock', provider_message_id text, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ds_followups (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  email_id text references public.ds_emails(id) on delete set null, status text not null, due_at timestamptz,
  detail text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ds_orders (
  id text primary key, lead_slug text not null references public.ds_leads(slug) on delete cascade,
  product_id text not null references public.ds_products(id), offer_name text not null, seller text,
  base_price numeric not null, negotiated_price numeric not null, discount numeric not null, cost numeric not null,
  margin numeric not null, currency text not null, commission_pct numeric not null, status text not null,
  created_at timestamptz not null default now()
);
create table public.ds_checkouts (id text primary key, order_id text unique not null references public.ds_orders(id) on delete cascade, status text not null, expires_at timestamptz, created_at timestamptz not null default now());
create table public.ds_payments (id text primary key, order_id text unique not null references public.ds_orders(id) on delete cascade, status text not null, amount numeric not null, currency text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.ds_contracts (id text primary key, order_id text unique not null references public.ds_orders(id) on delete cascade, status text not null, html text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.ds_handoffs (id text primary key, order_id text unique not null references public.ds_orders(id) on delete cascade, product_id text not null references public.ds_products(id), client text, seller text, requirements text, status text not null, retry_count integer not null default 0, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.ds_commissions (id text primary key, order_id text unique not null references public.ds_orders(id) on delete cascade, seller text, base numeric not null, pct numeric not null, amount numeric not null, state text not null, created_at timestamptz not null default now());
create table public.ds_inbound_events (id uuid primary key default extensions.gen_random_uuid(), source text not null, request_id text unique, payload jsonb not null, status text not null, error_sanitized text, created_at timestamptz not null default now());

insert into public.ds_products
  (id, name, billing, public_price, base_price, cost, commission_pct, max_discount_pct, currency, active, adapter, is_demo)
values
  ('datta360', 'Datta360° — DEMO / TESTE', 'one_time', 1500, 1500, 400, 10, 20, 'BRL', true, 'MockDatta360Adapter', true),
  ('dattavps', 'DattaVPS — DEMO / TESTE', 'recurring', 190, 190, 55, 12, 20, 'BRL', true, 'MockDattavpsAdapter', true),
  ('dattaseg', 'DattaSeg — DEMO / TESTE', 'recurring', 240, 240, 80, 12, 20, 'BRL', true, 'MockDattasegAdapter', true),
  ('dattahost', 'DattaHost — DEMO / TESTE', 'recurring', 45, 45, 12, 12, 20, 'BRL', true, 'MockDattahostAdapter', true);

insert into public.ds_settings (key, value)
values
  ('company_name', to_jsonb('DattaSeller'::text)),
  ('seller_name', to_jsonb('Vendedor DEMO'::text)),
  ('demo_mode', 'true'::jsonb),
  ('email_provider', to_jsonb('mock'::text)),
  ('email_sender', to_jsonb('demo@local.invalid'::text)),
  ('email_reply_to', to_jsonb('demo@local.invalid'::text)),
  ('followup_days', '3'::jsonb);

alter table public.ds_users enable row level security;
create policy "admin reads own profile" on public.ds_users for select to authenticated using (id = (select auth.uid()) and role = 'admin');

do $$
declare t text;
begin
  foreach t in array array['ds_leads','ds_lead_events','ds_settings','ds_products','ds_timeline','ds_qualifications','ds_site_diagnoses','ds_social_audits','ds_previews','ds_proposals','ds_emails','ds_followups','ds_orders','ds_checkouts','ds_payments','ds_contracts','ds_handoffs','ds_commissions','ds_inbound_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (exists (select 1 from public.ds_users u where u.id = (select auth.uid()) and u.role = ''admin'')) with check (exists (select 1 from public.ds_users u where u.id = (select auth.uid()) and u.role = ''admin''))', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
