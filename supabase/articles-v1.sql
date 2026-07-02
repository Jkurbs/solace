create table if not exists solace_articles (
  id text primary key,
  slug text not null unique,
  title text not null,
  dek text not null default '',
  body text not null default '',
  author text not null default 'Solace Research',
  handle text not null default '@solacefyi',
  label text not null default '',
  cover_direction text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solace_articles_status_published_at_idx
  on solace_articles(status, published_at desc);

create index if not exists solace_articles_slug_idx
  on solace_articles(slug);
