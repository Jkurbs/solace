-- Security Pass V1
-- Run this after SUPABASE_SERVICE_ROLE_KEY is configured in Vercel and local env.
-- The application should access these tables through server-only Supabase clients.

alter table if exists public.hermes_access_requests enable row level security;
alter table if exists public.solace_users enable row level security;
alter table if exists public.hermes_accounts enable row level security;
alter table if exists public.ledger_accounts enable row level security;
alter table if exists public.dashboard_invites enable row level security;
alter table if exists public.account_onboarding enable row level security;

alter table if exists public.users enable row level security;
alter table if exists public.accounts enable row level security;
alter table if exists public.ledger_entries enable row level security;
alter table if exists public.deposits enable row level security;
alter table if exists public.withdrawals enable row level security;
alter table if exists public.activities enable row level security;
alter table if exists public.portfolio_snapshots enable row level security;
alter table if exists public.treasury_transfers enable row level security;

do $$
declare
  target_name text;
  target_table regclass;
begin
  foreach target_name in array array[
    'hermes_access_requests',
    'solace_users',
    'hermes_accounts',
    'ledger_accounts',
    'dashboard_invites',
    'account_onboarding',
    'users',
    'accounts',
    'ledger_entries',
    'deposits',
    'withdrawals',
    'activities',
    'portfolio_snapshots',
    'treasury_transfers'
  ] loop
    target_table := to_regclass('public.' || target_name);

    if target_table is not null then
      execute format('grant all on table %s to service_role', target_table);
      execute format('revoke all on table %s from anon, authenticated', target_table);
    end if;
  end loop;
end $$;
