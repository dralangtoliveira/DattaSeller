# Migração SQLite DattaSeller

O banco operacional é `data/dattaseller-local.db`; o dashboard e o MCP usam o mesmo arquivo. A migração é idempotente: o `CREATE TABLE IF NOT EXISTS` preserva o esquema base e os `ALTER TABLE` acrescentam campos quando necessário.

Campos acrescentados: `instagram_url`, `source_url`, `source_checked_at`, `public_contact_type`, `product_suggested`, `product_reason`, `next_action`, `delivery_status`, `checkout_url`, `checkout_presented_at`, `checkout_clicked_at`, `qualification_json`, `site_audit_json`, `instagram_audit_json`, `valor_fechado` e `closing_confirmed_at`.

O servidor bloqueia HTTP 400 ao tentar marcar `fechado` sem `closingConfirmed=true` e `valor_fechado` positivo. O MCP exige `registrar_fechamento(..., confirmacao_explicita=True)`.
