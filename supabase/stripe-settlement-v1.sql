-- Stripe Settlement V1
-- Run this after Stripe Money Movement V1 and Treasury Queue V1.
-- This tracks when Stripe funds are actually available to Solace Treasury.

create table if not exists public.stripe_deposit_settlements (
  id text primary key,
  ledger_account_id text not null references public.ledger_accounts(id) on delete restrict,
  deposit_id text not null references public.solace_deposits(id) on delete restrict,
  checkout_session_id text not null unique,
  payment_intent_id text,
  charge_id text,
  balance_transaction_id text,
  gross_amount numeric(18, 2) not null,
  stripe_fee_amount numeric(18, 2) not null default 0,
  net_amount numeric(18, 2) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'pending' check (status in ('pending', 'available', 'unavailable')),
  balance_type text,
  reporting_category text,
  exchange_rate numeric(18, 8),
  stripe_created_at timestamptz,
  available_on timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_deposit_settlements_ledger_account_id_created_at_idx
  on public.stripe_deposit_settlements(ledger_account_id, created_at desc);

create index if not exists stripe_deposit_settlements_status_available_on_idx
  on public.stripe_deposit_settlements(status, available_on);

alter table public.stripe_deposit_settlements enable row level security;

grant all on table public.stripe_deposit_settlements to service_role;
revoke all on table public.stripe_deposit_settlements from anon, authenticated;

alter table public.treasury_tasks
  drop constraint if exists treasury_tasks_status_check;

alter table public.treasury_tasks
  add constraint treasury_tasks_status_check check (
    status in (
      'WAITING_SETTLEMENT',
      'QUEUED',
      'REVIEWING',
      'FUNDABLE',
      'APPROVED',
      'SUBMITTED',
      'COMPLETED',
      'FAILED',
      'CANCELED'
    )
  );

insert into public.stripe_deposit_settlements (
  id,
  ledger_account_id,
  deposit_id,
  checkout_session_id,
  payment_intent_id,
  gross_amount,
  stripe_fee_amount,
  net_amount,
  currency,
  status,
  created_at,
  updated_at
)
select
  'settlement_' || deposit.provider_reference,
  deposit.ledger_account_id,
  deposit.id,
  deposit.provider_reference,
  deposit.payment_intent_id,
  deposit.amount,
  0,
  deposit.amount,
  deposit.currency,
  'unavailable',
  coalesce(deposit.posted_at, deposit.created_at),
  coalesce(deposit.posted_at, deposit.created_at)
from public.solace_deposits deposit
where deposit.status = 'posted'
  and deposit.provider_reference is not null
on conflict (checkout_session_id) do nothing;
