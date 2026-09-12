BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE seller_role AS ENUM ('admin', 'seller', 'finance', 'operations');
CREATE TYPE opportunity_stage AS ENUM ('new', 'contact', 'interested', 'proposal', 'checkout_sent', 'paid', 'handoff', 'completed', 'lost');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('awaiting_payment', 'paid', 'handoff_pending', 'handoff_sent', 'onboarding', 'in_delivery', 'awaiting_customer', 'delivered', 'blocked');
CREATE TYPE recommendation_result AS ENUM ('dattavps', 'dattaseg', 'both', 'none');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role seller_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text,
  trade_name text,
  tax_id text UNIQUE,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (legal_name IS NOT NULL OR trade_name IS NOT NULL)
);

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  owner_id uuid REFERENCES users(id),
  full_name text,
  email text,
  phone_original text,
  phone_normalized text,
  source text NOT NULL,
  category text,
  lead_group text,
  consent_recorded_at timestamptz,
  opt_out_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (full_name IS NOT NULL OR company_id IS NOT NULL),
  CHECK (phone_normalized IS NULL OR phone_normalized ~ '^\\+[1-9][0-9]{7,14}$')
);

CREATE UNIQUE INDEX leads_unique_normalized_phone
  ON leads(phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE UNIQUE INDEX leads_unique_email_without_phone
  ON leads(lower(email)) WHERE email IS NOT NULL AND phone_normalized IS NULL;

CREATE TABLE lead_sources (
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source text NOT NULL,
  source_record_id text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, source, source_record_id)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_product_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  commercial_status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  external_plan_key text NOT NULL,
  name text NOT NULL,
  price_amount numeric(12, 2) NOT NULL CHECK (price_amount >= 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  recurring_interval text,
  commercial_status text NOT NULL DEFAULT 'draft',
  availability_status text NOT NULL DEFAULT 'unverified',
  conditions text,
  UNIQUE (product_id, external_plan_key)
);

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id),
  owner_id uuid NOT NULL REFERENCES users(id),
  product_id uuid REFERENCES products(id),
  stage opportunity_stage NOT NULL DEFAULT 'new',
  next_action text,
  next_action_at timestamptz,
  loss_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((stage = 'lost' AND loss_reason IS NOT NULL) OR stage <> 'lost')
);

CREATE TABLE recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id),
  result recommendation_result NOT NULL,
  rule_version text NOT NULL,
  reasons jsonb NOT NULL CHECK (jsonb_typeof(reasons) = 'array'),
  score integer NOT NULL DEFAULT 0,
  overridden_by uuid REFERENCES users(id),
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id),
  opportunity_id uuid REFERENCES opportunities(id),
  actor_id uuid REFERENCES users(id),
  type text NOT NULL,
  outcome text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_order_number text NOT NULL UNIQUE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id),
  company_id uuid REFERENCES companies(id),
  seller_id uuid NOT NULL REFERENCES users(id),
  product_plan_id uuid NOT NULL REFERENCES product_plans(id),
  authorized_amount numeric(12, 2) NOT NULL CHECK (authorized_amount >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  checkout_url text,
  status payment_status NOT NULL DEFAULT 'pending',
  correlation_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  provider text NOT NULL,
  external_order_id text,
  external_payment_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status payment_status NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  event_payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_payment_id)
);

CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  paid_payment_id uuid NOT NULL UNIQUE REFERENCES payments(id),
  paid_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id),
  seller_id uuid NOT NULL REFERENCES users(id),
  rule_version text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  target_product_key text NOT NULL,
  status delivery_status NOT NULL DEFAULT 'awaiting_payment',
  external_reference_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE integration_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id uuid NOT NULL REFERENCES delivery_orders(id),
  idempotency_key text NOT NULL UNIQUE,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  request_payload jsonb NOT NULL,
  response_payload jsonb,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_order_id, attempt_number)
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX opportunities_owner_stage_idx ON opportunities(owner_id, stage);
CREATE INDEX activities_lead_occurred_idx ON activities(lead_id, occurred_at DESC);
CREATE INDEX payments_order_idx ON payments(order_id);
CREATE INDEX integration_attempts_delivery_idx ON integration_attempts(delivery_order_id, created_at DESC);
CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at DESC);

COMMIT;
