-- Simulation Mode V1
-- Adds an explicit account mode so beta users can use simulated dashboard capital
-- while live accounts continue through Stripe-backed money movement.

alter table public.ledger_accounts
  add column if not exists account_mode text not null default 'SIMULATION'
  check (account_mode in ('SIMULATION', 'LIVE'));

alter table public.solace_deposits
  drop constraint if exists solace_deposits_provider_check;

alter table public.solace_deposits
  add constraint solace_deposits_provider_check
  check (provider in ('stripe', 'simulation'));

alter table public.solace_ledger_entries
  drop constraint if exists solace_ledger_entries_source_check;

alter table public.solace_ledger_entries
  add constraint solace_ledger_entries_source_check
  check (source in ('stripe', 'simulation', 'hermes', 'operator', 'treasury'));

