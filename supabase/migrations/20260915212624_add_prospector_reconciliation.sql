-- Artefato local: não aplicar em Production nesta etapa.
alter table public.ds_leads add column if not exists region text, add column if not exists search_radius_km numeric, add column if not exists target_quantity integer, add column if not exists search_limit integer, add column if not exists tiktok_url text, add column if not exists phone_normalized text, add column if not exists email_normalized text, add column if not exists domain_normalized text, add column if not exists instagram_normalized text, add column if not exists name_city_normalized text, add column if not exists contact_evidence jsonb not null default '[]'::jsonb;
create unique index if not exists ds_leads_phone_normalized_unique on public.ds_leads(phone_normalized) where deleted_at is null and phone_normalized <> '';
create unique index if not exists ds_leads_email_normalized_unique on public.ds_leads(email_normalized) where deleted_at is null and email_normalized <> '';
create index if not exists ds_leads_domain_normalized_idx on public.ds_leads(domain_normalized);
create index if not exists ds_leads_instagram_normalized_idx on public.ds_leads(instagram_normalized);
create index if not exists ds_leads_name_city_normalized_idx on public.ds_leads(name_city_normalized);
alter table public.ds_proposals add column if not exists artifacts jsonb not null default '{}'::jsonb;
