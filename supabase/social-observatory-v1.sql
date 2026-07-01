create table if not exists social_observatory_signals (
  id text primary key,
  source text not null check (
    source in (
      'git_commit',
      'git_worktree_change',
      'hermes_current_reading',
      'oracle_calibration',
      'production_deploy',
      'release_note',
      'solace_product_update',
      'founder_note',
      'media_asset',
      'x_timeline',
      'x_mention',
      'website_event',
      'operator'
    )
  ),
  source_ref text,
  title text not null,
  summary text not null,
  tags jsonb not null default '[]'::jsonb,
  platform_fit jsonb not null default '{}'::jsonb,
  content_value integer not null default 0 check (content_value >= 0 and content_value <= 10),
  risk_flags jsonb not null default '[]'::jsonb,
  status text not null default 'NEW' check (status in ('NEW', 'TRIAGED', 'DRAFTED', 'ARCHIVED')),
  raw_context jsonb not null default '{}'::jsonb,
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table social_observatory_signals
  drop constraint if exists social_observatory_signals_source_check;

alter table social_observatory_signals
  add constraint social_observatory_signals_source_check check (
    source in (
      'git_commit',
      'git_worktree_change',
      'hermes_current_reading',
      'oracle_calibration',
      'production_deploy',
      'release_note',
      'solace_product_update',
      'founder_note',
      'media_asset',
      'x_timeline',
      'x_mention',
      'website_event',
      'operator'
    )
  );

create table if not exists social_observatory_drafts (
  id text primary key,
  signal_id text references social_observatory_signals(id) on delete set null,
  platform text not null check (platform in ('x', 'linkedin', 'instagram', 'newsletter', 'homepage')),
  account text not null check (
    account in (
      'kerby_personal_x',
      'solace_x',
      'solace_linkedin',
      'solace_instagram',
      'solace_newsletter',
      'solace_homepage'
    )
  ),
  format text not null,
  body text not null,
  signal_intent text not null,
  recommendation text not null,
  scores jsonb not null default '{}'::jsonb,
  review_notes jsonb not null default '[]'::jsonb,
  revision_request text,
  status text not null default 'NEEDS_REVIEW' check (
    status in (
      'DRAFT',
      'NEEDS_REVIEW',
      'NEEDS_REVISION',
      'APPROVED',
      'PUBLISH_REQUESTED',
      'PUBLISHED',
      'REJECTED',
      'SAVED_FOR_LATER',
      'FAILED'
    )
  ),
  approved_at timestamptz,
  publish_requested_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  external_url text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists social_observatory_performance (
  id text primary key,
  draft_id text not null references social_observatory_drafts(id) on delete cascade,
  impressions integer not null default 0,
  replies integer not null default 0,
  bookmarks integer not null default 0,
  profile_visits integer not null default 0,
  clicks integer not null default 0,
  follows integer not null default 0,
  requests integer not null default 0,
  audience_quality integer not null default 0 check (audience_quality >= 0 and audience_quality <= 10),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists social_observatory_watchlist (
  id text primary key,
  source text not null check (source in ('x_account', 'x_search', 'internal_event', 'website')),
  label text not null,
  query text not null,
  tags jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists social_observatory_signals_status_created_at_idx
  on social_observatory_signals(status, created_at desc);

create index if not exists social_observatory_drafts_status_created_at_idx
  on social_observatory_drafts(status, created_at desc);

create index if not exists social_observatory_drafts_signal_id_idx
  on social_observatory_drafts(signal_id);

create index if not exists social_observatory_performance_draft_id_idx
  on social_observatory_performance(draft_id);

create index if not exists social_observatory_watchlist_active_idx
  on social_observatory_watchlist(active);
