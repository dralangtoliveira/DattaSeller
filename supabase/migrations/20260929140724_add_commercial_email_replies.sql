-- Respostas recebidas são auditáveis e vinculadas ao envio comercial original.
alter table public.ds_emails
  add column if not exists reply_received_at timestamptz,
  add column if not exists reply_provider_message_id text,
  add column if not exists reply_body text;

create unique index if not exists ds_emails_reply_provider_message_id_idx
  on public.ds_emails (reply_provider_message_id)
  where reply_provider_message_id is not null;
alter table public.ds_emails add column if not exists reply_received_at timestamptz, add column if not exists reply_provider_message_id text, add column if not exists reply_body text;
create unique index if not exists ds_emails_reply_provider_message_id_idx on public.ds_emails (reply_provider_message_id) where reply_provider_message_id is not null;
