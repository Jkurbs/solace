-- Hermes Source Marks V1
-- Run this after Pool Unit Accounting V1.
-- Hermes posts raw exchange/account marks here. Solace translates source returns
-- into pool NAV marks so exchange account size never overwrites Solace pool size.

create extension if not exists pgcrypto;

create table if not exists public.hermes_pool_source_marks (
  id text primary key,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  status text not null default 'applied' check (status in ('baseline', 'applied', 'stored')),
  source text not null default 'hermes_bridge' check (source in ('hermes_bridge', 'operator')),
  source_exchange text,
  source_equity numeric(18, 2) not null,
  source_cash_balance numeric(18, 2) not null default 0,
  source_allocated_capital numeric(18, 2) not null default 0,
  source_reserved_margin numeric(18, 2) not null default 0,
  source_realized_pnl numeric(18, 2) not null default 0,
  source_unrealized_pnl numeric(18, 2) not null default 0,
  source_fees numeric(18, 2) not null default 0,
  source_funding numeric(18, 2) not null default 0,
  source_return numeric(18, 10) not null default 0,
  applied_pool_equity numeric(18, 2),
  applied_pool_nav_per_unit numeric(28, 10),
  nav_snapshot_id text references public.pool_nav_snapshots(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint hermes_pool_source_marks_source_equity_nonnegative_check check (source_equity >= 0),
  constraint hermes_pool_source_marks_source_controls_nonnegative_check check (
    source_cash_balance >= 0
    and source_allocated_capital >= 0
    and source_reserved_margin >= 0
    and source_fees >= 0
    and source_funding >= 0
  ),
  constraint hermes_pool_source_marks_applied_nav_positive_check check (
    applied_pool_nav_per_unit is null or applied_pool_nav_per_unit > 0
  )
);

create index if not exists hermes_pool_source_marks_pool_effective_at_idx
  on public.hermes_pool_source_marks(pool_id, effective_at desc, created_at desc);

create index if not exists hermes_pool_source_marks_nav_snapshot_idx
  on public.hermes_pool_source_marks(nav_snapshot_id);

alter table public.hermes_pool_source_marks enable row level security;

grant all on table public.hermes_pool_source_marks to service_role;
revoke all on table public.hermes_pool_source_marks from anon, authenticated;

drop trigger if exists prevent_hermes_pool_source_marks_mutation on public.hermes_pool_source_marks;
create trigger prevent_hermes_pool_source_marks_mutation
  before update or delete on public.hermes_pool_source_marks
  for each row execute function public.prevent_pool_accounting_mutation();
