-- Hermes Decision Ledger V2 — verifiable immutability.
-- Adds a per-row hash chain: row_hash = SHA-256(canonical sealed fields +
-- prev_hash). Editing any historical row changes its hash and breaks every
-- row after it. resolution_hash commits the outcome/pnl at resolve time.
-- Chain heads get anchored outside Solace (git / X / OTS) so "the record
-- wasn't edited" is checkable math, not an operator promise.
-- Run after hermes-decision-ledger-v1.sql.

alter table public.hermes_decision_ledger
  add column if not exists prev_hash text,
  add column if not exists row_hash text,
  add column if not exists resolution_hash text;

-- Linearity: no two rows may claim the same predecessor. A concurrent seal
-- racing for the same chain tip fails and retries instead of forking.
create unique index if not exists hermes_decision_ledger_prev_hash_key
  on public.hermes_decision_ledger(prev_hash)
  where prev_hash is not null;

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

  -- Hash fields are write-once: settable while null (backfill), then frozen.
  if old.prev_hash is not null and new.prev_hash is distinct from old.prev_hash then
    raise exception 'Chain fields cannot be modified.';
  end if;

  if old.row_hash is not null and new.row_hash is distinct from old.row_hash then
    raise exception 'Chain fields cannot be modified.';
  end if;

  if old.resolution_hash is not null and new.resolution_hash is distinct from old.resolution_hash then
    raise exception 'Chain fields cannot be modified.';
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
