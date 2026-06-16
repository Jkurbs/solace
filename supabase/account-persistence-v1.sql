create table if not exists solace_users (
  id text primary key,
  access_request_id uuid references hermes_access_requests(id) on delete set null,
  name text not null,
  email text not null,
  status text not null check (status in ('APPROVED', 'ACTIVE', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists solace_users_email_idx
  on solace_users(email);

create table if not exists hermes_accounts (
  id text primary key,
  solace_user_id text not null references solace_users(id) on delete restrict,
  status text not null check (status in ('PENDING_ACTIVATION', 'ACTIVE', 'PAUSED', 'CLOSED')),
  risk_profile text not null check (risk_profile in ('Preservation', 'Balanced', 'Velocity')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hermes_accounts_solace_user_id_idx
  on hermes_accounts(solace_user_id);

create table if not exists ledger_accounts (
  id text primary key,
  solace_user_id text not null references solace_users(id) on delete restrict,
  hermes_account_id text not null references hermes_accounts(id) on delete restrict,
  label text not null,
  currency text not null default 'USD',
  status text not null check (status in ('PENDING_ACTIVATION', 'ACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ledger_accounts_solace_user_id_idx
  on ledger_accounts(solace_user_id);

create index if not exists ledger_accounts_hermes_account_id_idx
  on ledger_accounts(hermes_account_id);

create table if not exists dashboard_invites (
  id text primary key,
  access_request_id uuid references hermes_access_requests(id) on delete set null,
  ledger_account_id text not null references ledger_accounts(id) on delete restrict,
  code_hash text not null unique,
  status text not null check (status in ('ACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists dashboard_invites_ledger_account_id_idx
  on dashboard_invites(ledger_account_id);

create table if not exists account_onboarding (
  ledger_account_id text primary key references ledger_accounts(id) on delete restrict,
  complete boolean not null default false,
  risk_profile text not null check (risk_profile in ('Preservation', 'Balanced', 'Velocity')),
  account_review jsonb,
  deposit_intent_amount numeric(18, 2),
  identity_verification jsonb not null default '{"provider":"stripe_identity","status":"READY"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
