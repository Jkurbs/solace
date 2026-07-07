-- Hermes Decision Ledger V1
-- The public decision ledger (/trust). Rows are SEALED at decision time
-- (before the outcome is known) and RESOLVED later. The trigger below makes
-- the ledger's promises physical: rows cannot be deleted, sealed fields
-- cannot be edited, and a resolved row cannot be re-resolved.

create table if not exists public.hermes_decision_ledger (
  record_id text primary key,
  sealed_at timestamptz not null,
  decision text not null,
  posture text not null,
  note text not null default '',
  outcome text,
  pnl numeric(18, 2),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hermes_decision_ledger_sealed_at_idx
  on public.hermes_decision_ledger(sealed_at asc);

create or replace function public.hermes_decision_ledger_guard()
returns trigger as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Ledger rows cannot be deleted.';
  end if;

  if new.record_id is distinct from old.record_id
    or new.sealed_at is distinct from old.sealed_at
    or new.decision is distinct from old.decision
    or new.posture is distinct from old.posture
    or new.note is distinct from old.note then
    raise exception 'Sealed ledger fields cannot be modified.';
  end if;

  if old.outcome is not null
    and (new.outcome is distinct from old.outcome
      or new.pnl is distinct from old.pnl
      or new.resolved_at is distinct from old.resolved_at) then
    raise exception 'Resolved rows cannot be re-resolved.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists hermes_decision_ledger_guard_trigger on public.hermes_decision_ledger;

create trigger hermes_decision_ledger_guard_trigger
  before update or delete on public.hermes_decision_ledger
  for each row execute function public.hermes_decision_ledger_guard();

alter table public.hermes_decision_ledger enable row level security;

grant all on table public.hermes_decision_ledger to service_role;
revoke all on table public.hermes_decision_ledger from anon, authenticated;
