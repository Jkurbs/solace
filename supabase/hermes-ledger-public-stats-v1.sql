-- Hermes public record stats (homepage).
-- One row, maintained on each ledger insert/resolve. Not part of the hash chain.
-- Run after hermes-decision-ledger-v4.sql.

create table if not exists public.hermes_ledger_public_stats (
  id text primary key,
  sealed_decisions integer not null default 0,
  sided_positive integer not null default 0,
  sided_negative integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.hermes_ledger_public_stats enable row level security;
grant all on table public.hermes_ledger_public_stats to service_role;
revoke all on table public.hermes_ledger_public_stats from anon, authenticated;

create or replace function public.hermes_ledger_public_stats_apply()
returns trigger as $$
declare
  delta_decisions integer := 0;
  delta_pos integer := 0;
  delta_neg integer := 0;
begin
  if tg_op = 'INSERT' then
    if new.row_class is distinct from 'system' then
      delta_decisions := 1;
    end if;

    if new.row_class is distinct from 'backfill'
       and new.event_type is distinct from 'open'
       and new.outcome is not null
       and new.pnl is not null then
      if new.pnl > 0 then
        delta_pos := 1;
      elsif new.pnl < 0 then
        delta_neg := 1;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.outcome is null
       and new.outcome is not null
       and new.row_class is distinct from 'backfill'
       and new.event_type is distinct from 'open'
       and new.pnl is not null then
      if new.pnl > 0 then
        delta_pos := 1;
      elsif new.pnl < 0 then
        delta_neg := 1;
      end if;
    end if;
  end if;

  if delta_decisions = 0 and delta_pos = 0 and delta_neg = 0 then
    return coalesce(new, old);
  end if;

  insert into public.hermes_ledger_public_stats as stats (
    id,
    sealed_decisions,
    sided_positive,
    sided_negative,
    updated_at
  )
  values (
    'public',
    delta_decisions,
    delta_pos,
    delta_neg,
    now()
  )
  on conflict (id) do update set
    sealed_decisions = stats.sealed_decisions + excluded.sealed_decisions,
    sided_positive = stats.sided_positive + excluded.sided_positive,
    sided_negative = stats.sided_negative + excluded.sided_negative,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

drop trigger if exists hermes_ledger_public_stats_insert on public.hermes_decision_ledger;
create trigger hermes_ledger_public_stats_insert
  after insert on public.hermes_decision_ledger
  for each row execute function public.hermes_ledger_public_stats_apply();

drop trigger if exists hermes_ledger_public_stats_update on public.hermes_decision_ledger;
create trigger hermes_ledger_public_stats_update
  after update on public.hermes_decision_ledger
  for each row execute function public.hermes_ledger_public_stats_apply();

insert into public.hermes_ledger_public_stats (
  id,
  sealed_decisions,
  sided_positive,
  sided_negative
)
select
  'public',
  count(*) filter (where row_class is distinct from 'system'),
  count(*) filter (
    where row_class is distinct from 'backfill'
      and event_type is distinct from 'open'
      and outcome is not null
      and pnl is not null
      and pnl > 0
  ),
  count(*) filter (
    where row_class is distinct from 'backfill'
      and event_type is distinct from 'open'
      and outcome is not null
      and pnl is not null
      and pnl < 0
  )
from public.hermes_decision_ledger
on conflict (id) do update set
  sealed_decisions = excluded.sealed_decisions,
  sided_positive = excluded.sided_positive,
  sided_negative = excluded.sided_negative,
  updated_at = now();
