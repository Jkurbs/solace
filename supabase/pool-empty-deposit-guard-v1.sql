-- Pool Empty Deposit Guard V1
-- Run after pool-unit-accounting-v1.sql.
-- Prevents first user units from inheriting pre-user Hermes/source NAV marks.

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
