-- Hermes Realized Trade Events V1
-- Run after hermes-source-marks-v1.sql.
-- Closed positions are realized performance evidence. Hermes should post these
-- once when a position closes; Solace uses them to calculate strategy PnL
-- without treating KuCoin deposits/withdrawals as performance.

create table if not exists public.hermes_realized_trade_events (
  id text primary key,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  source_exchange text not null default 'kucoin_futures',
  source_trade_id text not null,
  source_position_id text,
  symbol text not null,
  side text not null check (side in ('LONG', 'SHORT')),
  quantity numeric(28, 10) not null default 0,
  entry_price numeric(18, 8),
  exit_price numeric(18, 8),
  realized_pnl numeric(18, 2) not null default 0,
  fees numeric(18, 2) not null default 0,
  funding numeric(18, 2) not null default 0,
  net_pnl numeric(18, 2) not null default 0,
  opened_at timestamptz,
  closed_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint hermes_realized_trade_events_quantity_nonnegative_check check (quantity >= 0),
  constraint hermes_realized_trade_events_costs_nonnegative_check check (fees >= 0 and funding >= 0),
  constraint hermes_realized_trade_events_price_nonnegative_check check (
    (entry_price is null or entry_price >= 0)
    and (exit_price is null or exit_price >= 0)
  ),
  constraint hermes_realized_trade_events_source_trade_unique unique (pool_id, source_exchange, source_trade_id)
);

create index if not exists hermes_realized_trade_events_pool_closed_at_idx
  on public.hermes_realized_trade_events(pool_id, closed_at desc, created_at desc);

create index if not exists hermes_realized_trade_events_symbol_closed_at_idx
  on public.hermes_realized_trade_events(symbol, closed_at desc);

alter table public.hermes_realized_trade_events enable row level security;

grant all on table public.hermes_realized_trade_events to service_role;
revoke all on table public.hermes_realized_trade_events from anon, authenticated;

drop trigger if exists prevent_hermes_realized_trade_events_mutation on public.hermes_realized_trade_events;
create trigger prevent_hermes_realized_trade_events_mutation
  before update or delete on public.hermes_realized_trade_events
  for each row execute function public.prevent_pool_accounting_mutation();
