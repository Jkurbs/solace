-- User Beta Reset V1
-- Destructive: removes app-level beta users, access requests, dashboard invites,
-- onboarding, ledger accounts, deposits, Stripe money-movement records, treasury
-- tasks, pool ownership, pool NAV snapshots, and Hermes bridge performance state.
--
-- Preserves schemas, functions, strategy pool definitions, Supabase Auth users
-- in auth.users, Stripe-side records, and bug reports.
--
-- Run after:
--   1. supabase/pool-unit-accounting-v1.sql
--   2. supabase/pool-empty-deposit-guard-v1.sql

begin;

truncate table
  public.dashboard_invites,
  public.account_onboarding,
  public.pool_deposit_allocations,
  public.pool_withdrawal_redemptions,
  public.pool_unit_events,
  public.user_pool_positions,
  public.hermes_pool_source_marks,
  public.pool_nav_snapshots,
  public.pool_allocation_snapshots,
  public.hermes_realized_trade_events,
  public.hermes_source_capital_flows,
  public.treasury_tasks,
  public.stripe_deposit_settlements,
  public.stripe_deposit_sessions,
  public.solace_activities,
  public.solace_ledger_entries,
  public.solace_deposits,
  public.ledger_accounts,
  public.hermes_accounts,
  public.solace_users,
  public.hermes_access_requests
restart identity cascade;

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

commit;

select
  (select count(*) from public.hermes_access_requests) as access_requests,
  (select count(*) from public.solace_users) as solace_users,
  (select count(*) from public.hermes_accounts) as hermes_accounts,
  (select count(*) from public.ledger_accounts) as ledger_accounts,
  (select count(*) from public.solace_deposits) as deposits,
  (select count(*) from public.treasury_tasks) as treasury_tasks,
  (select count(*) from public.pool_unit_events) as pool_unit_events,
  (select count(*) from public.user_pool_positions) as user_pool_positions,
  (select count(*) from public.pool_nav_snapshots) as pool_nav_snapshots,
  (select count(*) from public.strategy_pools where status = 'ACTIVE') as active_pools,
  (select count(*) from public.strategy_pools where status = 'PAUSED') as paused_pools;
