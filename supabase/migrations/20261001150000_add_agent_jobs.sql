-- DS-AGENT-01 — jobs agênticos do CRM para o executor compartilhado.
-- O CRM continua dono de estado, resultado, evidências e artefatos; nada
-- comercial é enviado ao executor além do contexto autorizado do job.
create table if not exists public.ds_agent_jobs (
  id text not null,
  tenant_id text not null,
  lead_slug text,
  job_type text not null,
  executor text not null default 'inline-worker',
  status text not null default 'queued',
  request jsonb not null default '{}'::jsonb,
  result jsonb,
  evidence jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  error_code text,
  requested_by uuid,
  attempts integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  constraint ds_agent_jobs_job_type_check check (job_type in ('BUILD_REDESIGN', 'ANALYZE_SOCIAL', 'BUILD_SOCIAL_DEMO')),
  constraint ds_agent_jobs_status_check check (status in ('queued', 'running', 'completed', 'failed'))
);

create index if not exists ds_agent_jobs_lead_idx on public.ds_agent_jobs (lead_slug, created_at desc);
create index if not exists ds_agent_jobs_status_idx on public.ds_agent_jobs (status, created_at desc);

alter table public.ds_agent_jobs enable row level security;

drop policy if exists "admins manage ds_agent_jobs" on public.ds_agent_jobs;
create policy "admins manage ds_agent_jobs" on public.ds_agent_jobs for all to authenticated
  using (exists (select 1 from public.ds_users u where u.id = (select auth.uid()) and u.role = 'admin'))
  with check (exists (select 1 from public.ds_users u where u.id = (select auth.uid()) and u.role = 'admin'));

grant select, insert, update, delete on public.ds_agent_jobs to authenticated;
grant all on public.ds_agent_jobs to service_role;
