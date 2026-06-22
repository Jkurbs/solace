create table if not exists bugops_reports (
  id uuid primary key default gen_random_uuid(),
  display_id text not null unique,
  source text not null default 'dashboard' check (source in ('dashboard', 'in_app', 'group_chat', 'operator', 'logs')),
  reporter_email text,
  reporter_name text,
  ledger_account_id text,
  page_url text,
  browser text,
  device text,
  screenshot_url text,
  session_id text,
  summary text,
  what_happened text not null,
  expected_behavior text,
  actual_behavior text,
  steps_to_reproduce jsonb not null default '[]'::jsonb,
  can_reproduce text not null default 'unknown' check (can_reproduce in ('yes', 'sometimes', 'no', 'unknown')),
  seriousness text,
  console_errors text,
  severity text not null check (severity in ('P0', 'P1', 'P2', 'P3')),
  trust_impact text not null check (trust_impact in ('trust_breaking', 'core_product', 'confusing', 'cosmetic')),
  area text not null,
  title text not null,
  user_impact text not null,
  likely_cause text not null,
  labels jsonb not null default '[]'::jsonb,
  missing_info jsonb not null default '[]'::jsonb,
  reproduction_steps jsonb not null default '[]'::jsonb,
  duplicate_of_id uuid references bugops_reports(id),
  duplicate_candidates jsonb not null default '[]'::jsonb,
  status text not null check (
    status in (
      'NEW',
      'NEEDS_INFO',
      'REPRODUCED',
      'ASSIGNED',
      'FIX_PROPOSED',
      'IN_REVIEW',
      'FIXED',
      'RELEASED',
      'VERIFIED',
      'CLOSED'
    )
  ),
  reporter_reply text not null,
  raw_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fixed_at timestamptz,
  released_at timestamptz,
  verified_at timestamptz,
  closed_at timestamptz
);

create index if not exists bugops_reports_status_created_at_idx
  on bugops_reports(status, created_at desc);

create index if not exists bugops_reports_severity_status_idx
  on bugops_reports(severity, status);

create index if not exists bugops_reports_area_idx
  on bugops_reports(area);

create index if not exists bugops_reports_ledger_account_id_idx
  on bugops_reports(ledger_account_id);

create index if not exists bugops_reports_duplicate_of_id_idx
  on bugops_reports(duplicate_of_id);
