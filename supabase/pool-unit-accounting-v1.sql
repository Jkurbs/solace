-- Pool Unit Accounting V1
-- Run this after Account Persistence V1 and Stripe Money Movement V1.
-- This introduces pooled Hermes accounting where users own units of a strategy pool.

create extension if not exists pgcrypto;

create table if not exists public.strategy_pools (
  id text primary key,
  name text not null,
  risk_profile text not null check (risk_profile in ('Preservation', 'Balanced', 'Velocity')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'CLOSED')),
  currency text not null default 'USD' check (currency = 'USD'),
  accounting_version text not null default 'pool_units_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_pools_accounting_version_check check (accounting_version in ('pool_units_v1'))
);

create table if not exists public.pool_nav_snapshots (
  id text primary key,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  gross_equity numeric(18, 2) not null default 0,
  cash_balance numeric(18, 2) not null default 0,
  allocated_capital numeric(18, 2) not null default 0,
  reserved_margin numeric(18, 2) not null default 0,
  realized_pnl numeric(18, 2) not null default 0,
  unrealized_pnl numeric(18, 2) not null default 0,
  fees numeric(18, 2) not null default 0,
  funding numeric(18, 2) not null default 0,
  total_units numeric(28, 10) not null default 0,
  nav_per_unit numeric(28, 10) not null default 1,
  accounting_version text not null default 'pool_units_v1',
  source text not null default 'operator' check (source in ('operator', 'exchange_mark', 'migration')),
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint pool_nav_snapshots_accounting_version_check check (accounting_version in ('pool_units_v1')),
  constraint pool_nav_snapshots_nav_positive_check check (nav_per_unit > 0),
  constraint pool_nav_snapshots_units_nonnegative_check check (total_units >= 0)
);

create table if not exists public.pool_unit_events (
  id text primary key,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  type text not null check (type in ('deposit_mint', 'withdrawal_burn', 'fee_accrual', 'manual_adjustment')),
  source text not null check (source in ('stripe_deposit', 'withdrawal', 'operator', 'nav_migration')),
  units_delta numeric(28, 10) not null,
  amount numeric(18, 2) not null default 0,
  currency text not null default 'USD' check (currency = 'USD'),
  nav_per_unit numeric(28, 10) not null,
  accounting_version text not null default 'pool_units_v1',
  effective_at timestamptz not null,
  source_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pool_unit_events_accounting_version_check check (accounting_version in ('pool_units_v1')),
  constraint pool_unit_events_nav_positive_check check (nav_per_unit > 0)
);

create table if not exists public.user_pool_positions (
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  units numeric(28, 10) not null default 0,
  available_units numeric(28, 10) not null default 0,
  nav_per_unit numeric(28, 10) not null default 1,
  equity numeric(18, 2) not null default 0,
  pool_share numeric(12, 8) not null default 0,
  accounting_version text not null default 'pool_units_v1',
  updated_at timestamptz not null default now(),
  primary key (pool_id, ledger_account_id),
  constraint user_pool_positions_accounting_version_check check (accounting_version in ('pool_units_v1')),
  constraint user_pool_positions_units_nonnegative_check check (units >= 0 and available_units >= 0),
  constraint user_pool_positions_nav_positive_check check (nav_per_unit > 0)
);

create table if not exists public.pool_deposit_allocations (
  id text primary key,
  deposit_id text not null references public.solace_deposits(id) on delete restrict,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  amount numeric(18, 2) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  nav_per_unit numeric(28, 10) not null,
  units_minted numeric(28, 10) not null,
  status text not null default 'pending' check (status in ('pending', 'posted', 'void')),
  pool_unit_event_id text references public.pool_unit_events(id) on delete restrict,
  accounting_version text not null default 'pool_units_v1',
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint pool_deposit_allocations_deposit_unique unique (deposit_id),
  constraint pool_deposit_allocations_accounting_version_check check (accounting_version in ('pool_units_v1')),
  constraint pool_deposit_allocations_nav_positive_check check (nav_per_unit > 0),
  constraint pool_deposit_allocations_units_positive_check check (units_minted >= 0)
);

create table if not exists public.pool_withdrawal_redemptions (
  id text primary key,
  withdrawal_reference text not null,
  pool_id text not null references public.strategy_pools(id) on delete restrict,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  amount numeric(18, 2) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  nav_per_unit numeric(28, 10) not null,
  units_burned numeric(28, 10) not null,
  status text not null default 'pending' check (status in ('pending', 'posted', 'void')),
  pool_unit_event_id text references public.pool_unit_events(id) on delete restrict,
  accounting_version text not null default 'pool_units_v1',
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint pool_withdrawal_redemptions_reference_unique unique (withdrawal_reference),
  constraint pool_withdrawal_redemptions_accounting_version_check check (accounting_version in ('pool_units_v1')),
  constraint pool_withdrawal_redemptions_nav_positive_check check (nav_per_unit > 0),
  constraint pool_withdrawal_redemptions_units_positive_check check (units_burned >= 0)
);

create index if not exists pool_nav_snapshots_pool_effective_at_idx
  on public.pool_nav_snapshots(pool_id, effective_at desc);

create index if not exists pool_unit_events_account_effective_at_idx
  on public.pool_unit_events(ledger_account_id, effective_at desc);

create index if not exists pool_unit_events_pool_effective_at_idx
  on public.pool_unit_events(pool_id, effective_at desc);

create index if not exists pool_deposit_allocations_account_created_at_idx
  on public.pool_deposit_allocations(ledger_account_id, created_at desc);

create index if not exists pool_withdrawal_redemptions_account_created_at_idx
  on public.pool_withdrawal_redemptions(ledger_account_id, created_at desc);

alter table public.strategy_pools enable row level security;
alter table public.pool_nav_snapshots enable row level security;
alter table public.pool_unit_events enable row level security;
alter table public.user_pool_positions enable row level security;
alter table public.pool_deposit_allocations enable row level security;
alter table public.pool_withdrawal_redemptions enable row level security;

grant all on table public.strategy_pools to service_role;
grant all on table public.pool_nav_snapshots to service_role;
grant all on table public.pool_unit_events to service_role;
grant all on table public.user_pool_positions to service_role;
grant all on table public.pool_deposit_allocations to service_role;
grant all on table public.pool_withdrawal_redemptions to service_role;

revoke all on table public.strategy_pools from anon, authenticated;
revoke all on table public.pool_nav_snapshots from anon, authenticated;
revoke all on table public.pool_unit_events from anon, authenticated;
revoke all on table public.user_pool_positions from anon, authenticated;
revoke all on table public.pool_deposit_allocations from anon, authenticated;
revoke all on table public.pool_withdrawal_redemptions from anon, authenticated;

create or replace function public.prevent_pool_accounting_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Pool accounting records are append-only. Create a new event or NAV snapshot instead.';
end;
$$;

drop trigger if exists prevent_pool_unit_events_mutation on public.pool_unit_events;
create trigger prevent_pool_unit_events_mutation
  before update or delete on public.pool_unit_events
  for each row execute function public.prevent_pool_accounting_mutation();

drop trigger if exists prevent_pool_nav_snapshots_mutation on public.pool_nav_snapshots;
create trigger prevent_pool_nav_snapshots_mutation
  before update or delete on public.pool_nav_snapshots
  for each row execute function public.prevent_pool_accounting_mutation();

insert into public.strategy_pools (id, name, risk_profile, status, currency, accounting_version)
values
  ('pool_preservation_v1', 'Hermes Preservation Pool', 'Preservation', 'ACTIVE', 'USD', 'pool_units_v1'),
  ('pool_balanced_v1', 'Hermes Balanced Pool', 'Balanced', 'ACTIVE', 'USD', 'pool_units_v1'),
  ('pool_velocity_v1', 'Hermes Velocity Pool', 'Velocity', 'ACTIVE', 'USD', 'pool_units_v1')
on conflict (id) do nothing;

insert into public.pool_nav_snapshots (
  id,
  pool_id,
  gross_equity,
  cash_balance,
  allocated_capital,
  reserved_margin,
  realized_pnl,
  unrealized_pnl,
  fees,
  funding,
  total_units,
  nav_per_unit,
  accounting_version,
  source,
  effective_at
)
select
  'nav_bootstrap_' || pool.id,
  pool.id,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  'pool_units_v1',
  'migration',
  now()
from public.strategy_pools pool
where pool.accounting_version = 'pool_units_v1'
on conflict (id) do nothing;

create or replace function public.post_pool_deposit_allocation(
  p_deposit_id text,
  p_ledger_account_id text,
  p_amount numeric,
  p_currency text default 'USD',
  p_source_reference text default null,
  p_effective_at timestamptz default now()
)
returns table (
  pool_id text,
  pool_unit_event_id text,
  units_minted numeric,
  nav_per_unit numeric,
  total_units numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accounting_version text := 'pool_units_v1';
  v_allocation_id text;
  v_allocated_capital numeric(18, 2) := 0;
  v_cash_balance numeric(18, 2) := 0;
  v_existing_allocation record;
  v_event_id text;
  v_fees numeric(18, 2) := 0;
  v_funding numeric(18, 2) := 0;
  v_gross_equity numeric(18, 2) := 0;
  v_latest_nav record;
  v_nav_per_unit numeric(28, 10);
  v_new_total_units numeric(28, 10);
  v_pool_id text;
  v_realized_pnl numeric(18, 2) := 0;
  v_reserved_margin numeric(18, 2) := 0;
  v_risk_profile text;
  v_snapshot_id text;
  v_total_units numeric(28, 10) := 0;
  v_unrealized_pnl numeric(18, 2) := 0;
  v_units_minted numeric(28, 10);
begin
  if p_currency <> 'USD' then
    raise exception 'Unsupported pool deposit currency: %', p_currency;
  end if;

  if p_amount <= 0 then
    raise exception 'Pool deposit amount must be positive.';
  end if;

  select
    allocation.pool_id,
    allocation.pool_unit_event_id,
    allocation.units_minted,
    allocation.nav_per_unit
  into v_existing_allocation
  from public.pool_deposit_allocations allocation
  where allocation.deposit_id = p_deposit_id
  limit 1;

  if found then
    select coalesce(nav.total_units, 0)
    into v_new_total_units
    from public.pool_nav_snapshots nav
    where nav.pool_id = v_existing_allocation.pool_id
    order by nav.effective_at desc, nav.created_at desc
    limit 1;

    pool_id := v_existing_allocation.pool_id;
    pool_unit_event_id := v_existing_allocation.pool_unit_event_id;
    units_minted := v_existing_allocation.units_minted;
    nav_per_unit := v_existing_allocation.nav_per_unit;
    total_units := coalesce(v_new_total_units, 0);
    return next;
    return;
  end if;

  select hermes.risk_profile
  into v_risk_profile
  from public.ledger_accounts ledger
  join public.hermes_accounts hermes on hermes.id = ledger.hermes_account_id
  where ledger.id = p_ledger_account_id
  limit 1;

  if not found then
    raise exception 'Ledger account % does not have an active Hermes account.', p_ledger_account_id;
  end if;

  if v_risk_profile not in ('Preservation', 'Balanced', 'Velocity') then
    raise exception 'Unsupported risk profile for pool allocation: %', v_risk_profile;
  end if;

  -- Beta uses one live Hermes source. Risk profile is a user preference label
  -- until separate source accounts or allocation policies exist per pool.
  v_pool_id := 'pool_balanced_v1';

  perform 1
  from public.strategy_pools pool
  where pool.id = v_pool_id
    and pool.status = 'ACTIVE'
  for update;

  if not found then
    raise exception 'Strategy pool % is not active.', v_pool_id;
  end if;

  select *
  into v_latest_nav
  from public.pool_nav_snapshots nav
  where nav.pool_id = v_pool_id
  order by nav.effective_at desc, nav.created_at desc
  limit 1;

  if found then
    v_total_units := coalesce(v_latest_nav.total_units, 0);

    if v_total_units > 0 then
      v_allocated_capital := coalesce(v_latest_nav.allocated_capital, 0);
      v_cash_balance := coalesce(v_latest_nav.cash_balance, 0);
      v_fees := coalesce(v_latest_nav.fees, 0);
      v_funding := coalesce(v_latest_nav.funding, 0);
      v_gross_equity := coalesce(v_latest_nav.gross_equity, 0);
      v_nav_per_unit := coalesce(v_latest_nav.nav_per_unit, 1);
      v_realized_pnl := coalesce(v_latest_nav.realized_pnl, 0);
      v_reserved_margin := coalesce(v_latest_nav.reserved_margin, 0);
      v_unrealized_pnl := coalesce(v_latest_nav.unrealized_pnl, 0);
    else
      v_nav_per_unit := 1;
    end if;
  else
    v_nav_per_unit := 1;
  end if;

  v_units_minted := round(p_amount / v_nav_per_unit, 10);
  v_new_total_units := v_total_units + v_units_minted;
  v_event_id := 'pool_evt_' || p_deposit_id;
  v_allocation_id := 'pool_dep_' || p_deposit_id;
  v_snapshot_id := 'nav_deposit_' || p_deposit_id;

  insert into public.pool_nav_snapshots (
    id,
    pool_id,
    gross_equity,
    cash_balance,
    allocated_capital,
    reserved_margin,
    realized_pnl,
    unrealized_pnl,
    fees,
    funding,
    total_units,
    nav_per_unit,
    accounting_version,
    source,
    effective_at,
    created_at
  )
  values (
    v_snapshot_id,
    v_pool_id,
    v_gross_equity + p_amount,
    v_cash_balance + p_amount,
    v_allocated_capital,
    v_reserved_margin,
    v_realized_pnl,
    v_unrealized_pnl,
    v_fees,
    v_funding,
    v_new_total_units,
    v_nav_per_unit,
    v_accounting_version,
    'operator',
    p_effective_at,
    p_effective_at
  );

  insert into public.pool_unit_events (
    id,
    pool_id,
    ledger_account_id,
    type,
    source,
    units_delta,
    amount,
    currency,
    nav_per_unit,
    accounting_version,
    effective_at,
    source_reference,
    metadata,
    created_at
  )
  values (
    v_event_id,
    v_pool_id,
    p_ledger_account_id,
    'deposit_mint',
    'stripe_deposit',
    v_units_minted,
    p_amount,
    p_currency,
    v_nav_per_unit,
    v_accounting_version,
    p_effective_at,
    p_source_reference,
    jsonb_build_object('deposit_id', p_deposit_id),
    p_effective_at
  );

  insert into public.pool_deposit_allocations (
    id,
    deposit_id,
    pool_id,
    ledger_account_id,
    amount,
    currency,
    nav_per_unit,
    units_minted,
    status,
    pool_unit_event_id,
    accounting_version,
    effective_at,
    created_at
  )
  values (
    v_allocation_id,
    p_deposit_id,
    v_pool_id,
    p_ledger_account_id,
    p_amount,
    p_currency,
    v_nav_per_unit,
    v_units_minted,
    'posted',
    v_event_id,
    v_accounting_version,
    p_effective_at,
    p_effective_at
  );

  insert into public.user_pool_positions as current_position (
    pool_id,
    ledger_account_id,
    units,
    available_units,
    nav_per_unit,
    equity,
    pool_share,
    accounting_version,
    updated_at
  )
  values (
    v_pool_id,
    p_ledger_account_id,
    v_units_minted,
    v_units_minted,
    v_nav_per_unit,
    round(v_units_minted * v_nav_per_unit, 2),
    case when v_new_total_units > 0 then round((v_units_minted / v_new_total_units) * 100, 8) else 0 end,
    v_accounting_version,
    p_effective_at
  )
  on conflict on constraint user_pool_positions_pkey do update
  set
    units = current_position.units + excluded.units,
    available_units = current_position.available_units + excluded.available_units,
    nav_per_unit = excluded.nav_per_unit,
    equity = round((current_position.units + excluded.units) * excluded.nav_per_unit, 2),
    accounting_version = excluded.accounting_version,
    updated_at = excluded.updated_at;

  update public.user_pool_positions position
  set
    nav_per_unit = v_nav_per_unit,
    equity = round(position.units * v_nav_per_unit, 2),
    pool_share = case when v_new_total_units > 0 then round((position.units / v_new_total_units) * 100, 8) else 0 end,
    updated_at = p_effective_at
  where position.pool_id = v_pool_id;

  pool_id := v_pool_id;
  pool_unit_event_id := v_event_id;
  units_minted := v_units_minted;
  nav_per_unit := v_nav_per_unit;
  total_units := v_new_total_units;
  return next;
end;
$$;

revoke all on function public.post_pool_deposit_allocation(text, text, numeric, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.post_pool_deposit_allocation(text, text, numeric, text, text, timestamptz) to service_role;

create or replace function public.post_pool_nav_mark(
  p_pool_id text,
  p_gross_equity numeric,
  p_cash_balance numeric,
  p_allocated_capital numeric,
  p_reserved_margin numeric,
  p_realized_pnl numeric,
  p_unrealized_pnl numeric,
  p_fees numeric,
  p_funding numeric,
  p_effective_at timestamptz default now()
)
returns table (
  pool_id text,
  nav_snapshot_id text,
  nav_per_unit numeric,
  total_units numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accounting_version text := 'pool_units_v1';
  v_nav_per_unit numeric(28, 10);
  v_snapshot_id text;
  v_total_units numeric(28, 10) := 0;
begin
  if p_gross_equity < 0 then
    raise exception 'Pool gross equity cannot be negative.';
  end if;

  if p_cash_balance < 0 or p_allocated_capital < 0 or p_reserved_margin < 0 or p_fees < 0 or p_funding < 0 then
    raise exception 'Pool NAV mark contains a negative control balance.';
  end if;

  perform 1
  from public.strategy_pools pool
  where pool.id = p_pool_id
    and pool.status = 'ACTIVE'
  for update;

  if not found then
    raise exception 'Strategy pool % is not active.', p_pool_id;
  end if;

  select coalesce(nav.total_units, 0)
  into v_total_units
  from public.pool_nav_snapshots nav
  where nav.pool_id = p_pool_id
  order by nav.effective_at desc, nav.created_at desc
  limit 1;
  v_total_units := coalesce(v_total_units, 0);

  if v_total_units > 0 and p_gross_equity <= 0 then
    raise exception 'Pool gross equity must be positive when units are outstanding.';
  end if;

  v_nav_per_unit := case
    when v_total_units > 0 then round(p_gross_equity / v_total_units, 10)
    else 1
  end;
  v_snapshot_id := 'nav_mark_' || p_pool_id || '_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.pool_nav_snapshots (
    id,
    pool_id,
    gross_equity,
    cash_balance,
    allocated_capital,
    reserved_margin,
    realized_pnl,
    unrealized_pnl,
    fees,
    funding,
    total_units,
    nav_per_unit,
    accounting_version,
    source,
    effective_at,
    created_at
  )
  values (
    v_snapshot_id,
    p_pool_id,
    round(p_gross_equity, 2),
    round(p_cash_balance, 2),
    round(p_allocated_capital, 2),
    round(p_reserved_margin, 2),
    round(p_realized_pnl, 2),
    round(p_unrealized_pnl, 2),
    round(p_fees, 2),
    round(p_funding, 2),
    v_total_units,
    v_nav_per_unit,
    v_accounting_version,
    'operator',
    p_effective_at,
    p_effective_at
  );

  update public.user_pool_positions position
  set
    nav_per_unit = v_nav_per_unit,
    equity = round(position.units * v_nav_per_unit, 2),
    pool_share = case when v_total_units > 0 then round((position.units / v_total_units) * 100, 8) else 0 end,
    updated_at = p_effective_at
  where position.pool_id = p_pool_id;

  pool_id := p_pool_id;
  nav_snapshot_id := v_snapshot_id;
  nav_per_unit := v_nav_per_unit;
  total_units := v_total_units;
  return next;
end;
$$;

revoke all on function public.post_pool_nav_mark(text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.post_pool_nav_mark(text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, timestamptz) to service_role;

do $$
declare
  posted_deposit record;
begin
  for posted_deposit in
    select
      deposit.id,
      deposit.ledger_account_id,
      deposit.amount,
      deposit.currency,
      deposit.provider_reference,
      coalesce(deposit.posted_at, deposit.created_at) as effective_at
    from public.solace_deposits deposit
    where deposit.status = 'posted'
    order by coalesce(deposit.posted_at, deposit.created_at) asc
  loop
    perform 1
    from public.post_pool_deposit_allocation(
      posted_deposit.id,
      posted_deposit.ledger_account_id,
      posted_deposit.amount,
      posted_deposit.currency,
      posted_deposit.provider_reference,
      posted_deposit.effective_at
    );
  end loop;
end $$;
