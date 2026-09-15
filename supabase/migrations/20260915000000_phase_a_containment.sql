-- Fase A: contenção estrutural. Esta migration deve ser aplicada somente por revisão operacional posterior.
alter table public.ds_leads
  add column if not exists deleted_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token text;

create unique index if not exists ds_leads_unsubscribe_token_idx
  on public.ds_leads (unsubscribe_token)
  where unsubscribe_token is not null and deleted_at is null;

drop index if exists public.ds_leads_email_normalized_idx;
create unique index ds_leads_email_normalized_idx
  on public.ds_leads (lower(email))
  where deleted_at is null and email is not null and email <> '';

alter table public.ds_emails
  add column if not exists sent_at timestamptz;

create index if not exists ds_emails_sent_at_idx
  on public.ds_emails (sent_at);
