-- ============================================================
-- News Desk · Supabase consolidated schema
-- Paste the whole file into Supabase Dashboard -> SQL Editor -> Run.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1) table (create if missing)
create table if not exists news_items (
  url           text primary key,
  title         text,
  source        text,
  category      text,        -- raw GNews category (classifier prior)
  desk          text,        -- legacy (unused)
  country       text,        -- 'us' | 'gb' | 'uz'
  field         text,        -- 'medicine'|'politics'|'economy'|'education'|'society'|'other'
  published_at  timestamptz,
  image         text,
  description   text,
  content       text,
  lang          text,
  summary_ko    text,
  summary_en    text,
  summary_uz    text,
  tags          text[],
  enriched      boolean default false,
  bookmarked    boolean default false,
  fetched_at    timestamptz default now()
);

-- 2) upgrade an existing table (adds only missing columns)
alter table news_items add column if not exists category   text;
alter table news_items add column if not exists desk       text;
alter table news_items add column if not exists country    text;
alter table news_items add column if not exists field      text;
alter table news_items add column if not exists content    text;
alter table news_items add column if not exists lang       text;
alter table news_items add column if not exists summary_ko text;
alter table news_items add column if not exists summary_en text;
alter table news_items add column if not exists summary_uz text;
alter table news_items add column if not exists tags       text[];
alter table news_items add column if not exists enriched   boolean default false;
alter table news_items add column if not exists bookmarked boolean default false;
alter table news_items add column if not exists fetched_at timestamptz default now();

-- 3) indexes
create index if not exists news_items_published_idx on news_items (published_at desc);
create index if not exists news_items_country_idx   on news_items (country);
create index if not exists news_items_field_idx     on news_items (field);

-- 4) personal use: disable RLS (anon key reads/writes directly)
alter table news_items disable row level security;

-- ── (optional) keep RLS ON instead of the line above: ──
-- alter table news_items enable row level security;
-- drop policy if exists "anon all" on news_items;
-- create policy "anon all" on news_items
--   for all to anon using (true) with check (true);
