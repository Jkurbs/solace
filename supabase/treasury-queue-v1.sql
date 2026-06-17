-- Treasury Queue V1
-- Run this after Stripe Money Movement V1.

create table if not exists public.treasury_tasks (
  id text primary key,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  deposit_id text not null references public.solace_deposits(id) on delete restrict,
  checkout_session_id text not null,
  type text not null default 'FUND_HERMES' check (type in ('FUND_HERMES')),
  amount numeric(18, 2) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'QUEUED' check (
    status in ('QUEUED', 'REVIEWING', 'APPROVED', 'SUBMITTED', 'COMPLETED', 'FAILED', 'CANCELED')
  ),
  notes text,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint treasury_tasks_checkout_session_id_unique unique (checkout_session_id)
);

create index if not exists treasury_tasks_ledger_account_id_created_at_idx
  on public.treasury_tasks(ledger_account_id, created_at desc);

create index if not exists treasury_tasks_status_created_at_idx
  on public.treasury_tasks(status, created_at desc);

alter table public.treasury_tasks enable row level security;

grant all on table public.treasury_tasks to service_role;
revoke all on table public.treasury_tasks from anon, authenticated;

insert into public.treasury_tasks (
  id,
  ledger_account_id,
  deposit_id,
  checkout_session_id,
  type,
  amount,
  currency,
  status,
  notes,
  created_at,
  updated_at
)
select
  'treasury_task_' || deposit.provider_reference,
  deposit.ledger_account_id,
  deposit.id,
  deposit.provider_reference,
  'FUND_HERMES',
  deposit.amount,
  deposit.currency,
  'QUEUED',
  'Backfilled from an existing posted Stripe deposit.',
  coalesce(deposit.posted_at, deposit.created_at),
  coalesce(deposit.posted_at, deposit.created_at)
from public.solace_deposits deposit
where deposit.status = 'posted'
  and deposit.provider_reference is not null
on conflict (checkout_session_id) do nothing;
