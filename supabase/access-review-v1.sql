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
  account_id text,
  account_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hermes_access_requests_status_created_at_idx
  on hermes_access_requests(status, created_at desc);

create index if not exists hermes_access_requests_email_idx
  on hermes_access_requests(email);
