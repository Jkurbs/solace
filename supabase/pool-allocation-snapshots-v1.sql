-- Pool Allocation Snapshots V1
-- Stores the latest Hermes positioning view for a strategy pool.

create table if not exists public.pool_allocation_snapshots (
  id text primary key,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  allocation_basis text not null default 'capital' check (allocation_basis in ('capital', 'exposure')),
  allocations jsonb not null default '[]'::jsonb,
  total_exposure numeric(18, 2) not null default 0 check (total_exposure >= 0),
  total_margin numeric(18, 2) not null default 0 check (total_margin >= 0),
  cash_balance numeric(18, 2) not null default 0 check (cash_balance >= 0),
  source text not null default 'hermes_bridge' check (source in ('hermes_bridge', 'operator')),
  effective_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pool_allocation_snapshots_pool_effective_at_idx
  on public.pool_allocation_snapshots(pool_id, effective_at desc, created_at desc);

alter table public.pool_allocation_snapshots enable row level security;

grant all on table public.pool_allocation_snapshots to service_role;
revoke all on table public.pool_allocation_snapshots from anon, authenticated;

