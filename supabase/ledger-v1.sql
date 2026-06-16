create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  risk_profile text not null check (risk_profile in ('Preservation', 'Balanced', 'Velocity')),
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  label text not null,
  currency text not null default 'USD',
  status text not null check (status in ('PENDING_ACTIVATION', 'ACTIVE')),
  created_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  type text not null check (type in ('deposit', 'withdrawal', 'pnl', 'fee', 'manual_adjustment')),
  source text not null check (source in ('stripe', 'hermes', 'operator', 'treasury')),
  status text not null check (status in ('pending', 'posted', 'void')),
  amount numeric(18, 2) not null,
  currency text not null default 'USD',
  description text not null,
  external_reference text,
  effective_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_account_effective_at_idx
  on ledger_entries(account_id, effective_at desc);

create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  amount numeric(18, 2) not null,
  currency text not null default 'USD',
  status text not null check (status in ('pending', 'posted', 'failed')),
  provider text not null check (provider in ('stripe')),
  provider_reference text,
  created_at timestamptz not null default now(),
  posted_at timestamptz
);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  amount numeric(18, 2) not null,
  currency text not null default 'USD',
  status text not null check (status in ('requested', 'approved', 'paid', 'canceled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  portfolio_value numeric(18, 2) not null,
  cash_reserve numeric(6, 2) not null,
  capital_deployed numeric(6, 2) not null,
  allocations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_snapshots_account_created_at_idx
  on portfolio_snapshots(account_id, created_at desc);

create table if not exists treasury_transfers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  amount numeric(18, 2) not null,
  currency text not null default 'USD',
  from_venue text not null check (from_venue in ('solace_operating')),
  to_venue text not null check (to_venue in ('kucoin')),
  status text not null check (status in ('planned', 'initiated', 'completed', 'reconciled')),
  notes text not null,
  external_reference text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
