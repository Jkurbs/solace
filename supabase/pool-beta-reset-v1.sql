-- Pool Beta Reset V1
-- Destructive: clears pool accounting, pool allocation snapshots, and Hermes
-- bridge performance evidence, then rebuilds pool units from posted deposits.
-- Preserves users, access requests, onboarding, ledger accounts, deposits,
-- Stripe records, ledger entries, activities, and treasury tasks.
--
-- Run after:
--   1. supabase/pool-unit-accounting-v1.sql
--   2. supabase/pool-empty-deposit-guard-v1.sql

begin;

do $$
declare
  v_paid_withdrawals integer := 0;
  v_pool_redemptions integer := 0;
begin
  if to_regclass('public.withdrawals') is not null then
    execute 'select count(*) from public.withdrawals where status = ''paid'''
    into v_paid_withdrawals;
  end if;

  select count(*)
  into v_pool_redemptions
  from public.pool_withdrawal_redemptions;

  if v_paid_withdrawals > 0 or v_pool_redemptions > 0 then
    raise exception
      'Pool beta reset aborted: withdrawal history exists but withdrawal unit rebuild is not implemented. paid_withdrawals=%, pool_redemptions=%',
      v_paid_withdrawals,
      v_pool_redemptions;
  end if;
end $$;

truncate table
  public.pool_deposit_allocations,
  public.pool_withdrawal_redemptions,
  public.pool_unit_events,
  public.user_pool_positions,
  public.hermes_pool_source_marks,
  public.pool_nav_snapshots,
  public.pool_allocation_snapshots,
  public.hermes_realized_trade_events,
  public.hermes_source_capital_flows
restart identity;

insert into public.strategy_pools (id, name, risk_profile, status, currency, accounting_version)
values
  ('pool_preservation_v1', 'Hermes Preservation Pool', 'Preservation', 'PAUSED', 'USD', 'pool_units_v1'),
  ('pool_balanced_v1', 'Hermes Balanced Pool', 'Balanced', 'ACTIVE', 'USD', 'pool_units_v1'),
  ('pool_velocity_v1', 'Hermes Velocity Pool', 'Velocity', 'PAUSED', 'USD', 'pool_units_v1')
on conflict (id) do update
set
  accounting_version = excluded.accounting_version,
  currency = excluded.currency,
  name = excluded.name,
  risk_profile = excluded.risk_profile,
  status = excluded.status,
  updated_at = now();

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
  now(),
  now()
from public.strategy_pools pool
where pool.accounting_version = 'pool_units_v1'
on conflict (id) do update
set
  accounting_version = excluded.accounting_version,
  allocated_capital = excluded.allocated_capital,
  cash_balance = excluded.cash_balance,
  created_at = excluded.created_at,
  effective_at = excluded.effective_at,
  fees = excluded.fees,
  funding = excluded.funding,
  gross_equity = excluded.gross_equity,
  nav_per_unit = excluded.nav_per_unit,
  realized_pnl = excluded.realized_pnl,
  reserved_margin = excluded.reserved_margin,
  source = excluded.source,
  total_units = excluded.total_units,
  unrealized_pnl = excluded.unrealized_pnl;

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
    order by coalesce(deposit.posted_at, deposit.created_at) asc, deposit.created_at asc
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

commit;

select
  (select count(*) from public.strategy_pools where status = 'ACTIVE') as active_pools,
  (select count(*) from public.strategy_pools where status = 'PAUSED') as paused_pools,
  (select count(*) from public.pool_nav_snapshots) as pool_nav_snapshots,
  (select count(*) from public.pool_unit_events) as pool_unit_events,
  (select count(*) from public.user_pool_positions) as user_pool_positions,
  (select count(*) from public.pool_deposit_allocations) as pool_deposit_allocations,
  (select coalesce(sum(gross_equity), 0) from public.pool_nav_snapshots where pool_id = 'pool_balanced_v1') as balanced_snapshot_equity_total,
  (select coalesce(sum(units), 0) from public.user_pool_positions where pool_id = 'pool_balanced_v1') as balanced_user_units;
