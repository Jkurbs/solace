-- Hermes Source Capital Flows V1
-- Run after hermes-source-marks-v1.sql.
-- External KuCoin deposits/withdrawals are not strategy PnL. These append-only
-- records let Solace neutralize source-account cash flows when translating
-- Hermes account equity into Solace pool NAV returns.

create table if not exists public.hermes_source_capital_flows (
  id text primary key,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  direction text not null check (direction in ('SOURCE_DEPOSIT', 'SOURCE_WITHDRAWAL')),
  amount numeric(18, 2) not null check (amount > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  source_exchange text,
  notes text,
  effective_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists hermes_source_capital_flows_pool_effective_at_idx
  on public.hermes_source_capital_flows(pool_id, effective_at desc, created_at desc);

alter table public.hermes_source_capital_flows enable row level security;

grant all on table public.hermes_source_capital_flows to service_role;
revoke all on table public.hermes_source_capital_flows from anon, authenticated;

drop trigger if exists prevent_hermes_source_capital_flows_mutation on public.hermes_source_capital_flows;
create trigger prevent_hermes_source_capital_flows_mutation
  before update or delete on public.hermes_source_capital_flows
  for each row execute function public.prevent_pool_accounting_mutation();
