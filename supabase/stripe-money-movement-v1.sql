-- Stripe Money Movement V1
-- Run this before enabling live dashboard deposits.

create table if not exists public.stripe_deposit_sessions (
  id text primary key,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  amount numeric(18, 2) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null check (status in ('open', 'posted', 'expired', 'failed')),
  checkout_url text,
  payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists stripe_deposit_sessions_ledger_account_id_idx
  on public.stripe_deposit_sessions(ledger_account_id);

create table if not exists public.solace_deposits (
  id text primary key,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  amount numeric(18, 2) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null check (status in ('pending', 'posted', 'failed')),
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_reference text unique,
  payment_intent_id text,
  created_at timestamptz not null default now(),
  posted_at timestamptz
);

create index if not exists solace_deposits_ledger_account_id_created_at_idx
  on public.solace_deposits(ledger_account_id, created_at desc);

create table if not exists public.solace_ledger_entries (
  id text primary key,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  type text not null check (type in ('deposit', 'withdrawal', 'pnl', 'fee', 'manual_adjustment')),
  source text not null check (source in ('stripe', 'hermes', 'operator', 'treasury')),
  status text not null check (status in ('pending', 'posted', 'void')),
  amount numeric(18, 2) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  description text not null,
  external_reference text,
  effective_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists solace_ledger_entries_account_effective_at_idx
  on public.solace_ledger_entries(ledger_account_id, effective_at desc);

create table if not exists public.solace_activities (
  id text primary key,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists solace_activities_account_created_at_idx
  on public.solace_activities(ledger_account_id, created_at desc);

alter table public.stripe_deposit_sessions enable row level security;
alter table public.solace_deposits enable row level security;
alter table public.solace_ledger_entries enable row level security;
alter table public.solace_activities enable row level security;

grant all on table public.stripe_deposit_sessions to service_role;
grant all on table public.solace_deposits to service_role;
grant all on table public.solace_ledger_entries to service_role;
grant all on table public.solace_activities to service_role;

revoke all on table public.stripe_deposit_sessions from anon, authenticated;
revoke all on table public.solace_deposits from anon, authenticated;
revoke all on table public.solace_ledger_entries from anon, authenticated;
revoke all on table public.solace_activities from anon, authenticated;
