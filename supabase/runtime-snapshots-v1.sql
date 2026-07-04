-- Runtime Snapshots V1
-- Small key/value store for singleton runtime documents pushed by the Hermes
-- bridge (brief snapshot, public reading). Serverless instances are ephemeral,
-- so file/memory persistence is instance-local; this table makes the latest
-- document durable across instances and deploys.

create table if not exists public.solace_runtime_snapshots (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.solace_runtime_snapshots enable row level security;

grant all on table public.solace_runtime_snapshots to service_role;
revoke all on table public.solace_runtime_snapshots from anon, authenticated;
