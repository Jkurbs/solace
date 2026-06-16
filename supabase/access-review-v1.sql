create table if not exists hermes_access_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  role text,
  organization text,
  country text not null,
  capital_range text,
  objective text,
  context text,
  status text not null check (status in ('new', 'review', 'more_info', 'approved', 'declined')),
  ai_recommendation text not null check (ai_recommendation in ('APPROVE', 'REVIEW', 'DECLINE')),
  ai_confidence text not null check (ai_confidence in ('LOW', 'MEDIUM', 'HIGH')),
  ai_reasons jsonb not null default '[]'::jsonb,
  ai_missing_info jsonb not null default '[]'::jsonb,
  ai_risk_flags jsonb not null default '[]'::jsonb,
  ai_review_source text not null check (ai_review_source in ('openai', 'rules')),
  ai_review_model text,
  ai_reviewed_at timestamptz not null,
  human_decision text check (human_decision in ('APPROVED', 'DECLINED', 'REQUEST_MORE_INFO')),
  human_decision_at timestamptz,
  solace_user_id text,
  solace_user_status text check (solace_user_status in ('APPROVED', 'ACTIVE', 'SUSPENDED')),
  hermes_account_id text,
  hermes_account_status text check (hermes_account_status in ('PENDING_ACTIVATION', 'ACTIVE', 'PAUSED', 'CLOSED')),
  ledger_account_id text,
  account_id text,
  account_created_at timestamptz,
  dashboard_invite_id text,
  dashboard_invite_code text,
  dashboard_invite_code_hash text,
  dashboard_invite_status text check (dashboard_invite_status in ('ACTIVE', 'REVOKED')),
  dashboard_invite_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hermes_access_requests
  add column if not exists solace_user_id text,
  add column if not exists solace_user_status text,
  add column if not exists hermes_account_id text,
  add column if not exists hermes_account_status text,
  add column if not exists ledger_account_id text,
  add column if not exists dashboard_invite_id text,
  add column if not exists dashboard_invite_code text,
  add column if not exists dashboard_invite_code_hash text,
  add column if not exists dashboard_invite_status text,
  add column if not exists dashboard_invite_created_at timestamptz;

create index if not exists hermes_access_requests_status_created_at_idx
  on hermes_access_requests(status, created_at desc);

create index if not exists hermes_access_requests_email_idx
  on hermes_access_requests(email);

create index if not exists hermes_access_requests_ledger_account_id_idx
  on hermes_access_requests(ledger_account_id);

create index if not exists hermes_access_requests_dashboard_invite_hash_idx
  on hermes_access_requests(dashboard_invite_code_hash);
