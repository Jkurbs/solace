-- Hermes Decision Ledger V4 — Hermes agent version on each sealed row.
-- Adds an UNHASHED write-once metadata column (same pattern as V3
-- event_type / ref / row_class). Existing row hashes are untouched.
--
--   hermes_version: software id that made the commitment (e.g. '0.2.0').
--                   Null on rows sealed before this migration.
--
-- The running product label lives in features/hermes-version.ts; new seals
-- stamp hermesVersion.id. A version cutover should also seal a system row
-- whose decision/note name the new version (those fields ARE hashed).
-- Run after hermes-decision-ledger-v3.sql.

alter table public.hermes_decision_ledger
  add column if not exists hermes_version text;

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

  if old.prev_hash is not null and new.prev_hash is distinct from old.prev_hash then
    raise exception 'Chain fields cannot be modified.';
  end if;

  if old.row_hash is not null and new.row_hash is distinct from old.row_hash then
    raise exception 'Chain fields cannot be modified.';
  end if;

  if old.resolution_hash is not null and new.resolution_hash is distinct from old.resolution_hash then
    raise exception 'Chain fields cannot be modified.';
  end if;

  if old.row_class is not null and new.row_class is distinct from old.row_class then
    raise exception 'Row class cannot be modified.';
  end if;

  if old.event_type is not null and new.event_type is distinct from old.event_type then
    raise exception 'Event type cannot be modified.';
  end if;

  if old.ref is not null and new.ref is distinct from old.ref then
    raise exception 'Ref cannot be modified.';
  end if;

  if old.hermes_version is not null and new.hermes_version is distinct from old.hermes_version then
    raise exception 'Hermes version cannot be modified.';
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
