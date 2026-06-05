-- AI Daily Feed foundation. This layer stores source metadata, filtered
-- candidates, and generated lesson packets. Full copyrighted source text is
-- intentionally not modeled here; use excerpts, metadata, and canonical links.

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('rss', 'news_api', 'youtube', 'manual', 'podcast')),
  source_name text not null,
  source_url text not null,
  language text not null default 'ja' check (language in ('ja', 'en', 'mixed')),
  topic_tags text[] not null default '{}',
  difficulty_bias text check (difficulty_bias is null or difficulty_bias in ('N5', 'N4', 'N3', 'N2', 'N1')),
  license_policy text not null default 'metadata_only' check (
    license_policy in ('metadata_only', 'excerpt_allowed', 'full_allowed')
  ),
  fetch_frequency text not null default 'daily' check (fetch_frequency in ('daily', 'weekly', 'manual')),
  active boolean not null default true,
  last_fetched_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_sources_system_url_unique
  on public.content_sources(source_url)
  where user_id is null;
create unique index if not exists content_sources_user_url_unique
  on public.content_sources(user_id, source_url)
  where user_id is not null;
create index if not exists content_sources_active_fetch_idx
  on public.content_sources(active, fetch_frequency, source_type);
create index if not exists content_sources_user_active_idx
  on public.content_sources(user_id, active, source_type);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.content_sources(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  source_url text not null,
  source_type text not null check (source_type in ('news', 'youtube', 'podcast', 'article', 'manual')),
  raw_excerpt text,
  published_at timestamptz,
  language text not null default 'ja' check (language in ('ja', 'en', 'mixed')),
  topic_tags text[] not null default '{}',
  ai_summary_zh text,
  ai_summary_ja text,
  jlpt_estimate text check (jlpt_estimate is null or jlpt_estimate in ('N5', 'N4', 'N3', 'N2', 'N1')),
  interest_score int check (interest_score is null or (interest_score >= 0 and interest_score <= 100)),
  learning_value_score int check (learning_value_score is null or (learning_value_score >= 0 and learning_value_score <= 100)),
  novelty_score int check (novelty_score is null or (novelty_score >= 0 and novelty_score <= 100)),
  safety_score int check (safety_score is null or (safety_score >= 0 and safety_score <= 100)),
  has_audio boolean not null default false,
  has_transcript boolean not null default false,
  approved_for_daily boolean not null default false,
  rejection_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_items_system_url_unique
  on public.content_items(source_url)
  where user_id is null;
create unique index if not exists content_items_user_url_unique
  on public.content_items(user_id, source_url)
  where user_id is not null;
create index if not exists content_items_daily_candidates_idx
  on public.content_items(approved_for_daily, learning_value_score desc, interest_score desc, novelty_score desc)
  where approved_for_daily = true;
create index if not exists content_items_user_created_idx
  on public.content_items(user_id, created_at desc);
create index if not exists content_items_source_created_idx
  on public.content_items(source_id, created_at desc);

create table if not exists public.daily_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_date date not null default current_date,
  content_item_id uuid references public.content_items(id) on delete set null,
  cultural_content_id uuid references public.cultural_contents(id) on delete set null,
  status text not null default 'ready' check (status in ('draft', 'ready', 'completed', 'archived')),
  hook_zh text,
  easy_summary_ja text,
  original_snippet text,
  key_vocab jsonb not null default '[]',
  key_grammar jsonb not null default '[]',
  sentence_mining jsonb not null default '[]',
  shadowing_line text,
  output_mission text,
  review_cards_created boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_date),
  check (content_item_id is not null or cultural_content_id is not null)
);

create index if not exists daily_lessons_user_date_idx
  on public.daily_lessons(user_id, lesson_date desc);
create index if not exists daily_lessons_content_item_idx
  on public.daily_lessons(content_item_id)
  where content_item_id is not null;
create index if not exists daily_lessons_cultural_content_idx
  on public.daily_lessons(cultural_content_id)
  where cultural_content_id is not null;

grant select, insert, update, delete on public.content_sources to authenticated;
grant select, insert, update, delete on public.content_items to authenticated;
grant select, insert, update, delete on public.daily_lessons to authenticated;

drop trigger if exists content_sources_updated_at on public.content_sources;
create trigger content_sources_updated_at
  before update on public.content_sources
  for each row execute function public.set_updated_at();

drop trigger if exists content_items_updated_at on public.content_items;
create trigger content_items_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

drop trigger if exists daily_lessons_updated_at on public.daily_lessons;
create trigger daily_lessons_updated_at
  before update on public.daily_lessons
  for each row execute function public.set_updated_at();

alter table public.content_sources enable row level security;
alter table public.content_items enable row level security;
alter table public.daily_lessons enable row level security;

drop policy if exists "view own and system content sources" on public.content_sources;
create policy "view own and system content sources" on public.content_sources
  for select
  to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

drop policy if exists "insert own content sources" on public.content_sources;
create policy "insert own content sources" on public.content_sources
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own content sources" on public.content_sources;
create policy "update own content sources" on public.content_sources
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own content sources" on public.content_sources;
create policy "delete own content sources" on public.content_sources
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "view own and system content items" on public.content_items;
create policy "view own and system content items" on public.content_items
  for select
  to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

drop policy if exists "insert own content items" on public.content_items;
create policy "insert own content items" on public.content_items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own content items" on public.content_items;
create policy "update own content items" on public.content_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own content items" on public.content_items;
create policy "delete own content items" on public.content_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own daily lessons" on public.daily_lessons;
create policy "own daily lessons" on public.daily_lessons
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Seed system sources from the curated media references already maintained by
-- the Cultural Hub. These are metadata-only sources; lesson generation should
-- still link back to canonical pages and avoid storing full copyrighted text.
insert into public.content_sources (
  source_type,
  source_name,
  source_url,
  language,
  topic_tags,
  difficulty_bias,
  license_policy,
  fetch_frequency,
  metadata
)
select
  'youtube',
  channel_name,
  'https://www.youtube.com/channel/' || channel_id,
  'ja',
  array[category],
  null,
  'metadata_only',
  'weekly',
  jsonb_build_object(
    'channel_id', channel_id,
    'recommended_jlpt', recommended_jlpt,
    'has_jp_subs', has_jp_subs,
    'description', description
  )
from public.curated_channels
on conflict do nothing;

insert into public.content_sources (
  source_type,
  source_name,
  source_url,
  language,
  topic_tags,
  difficulty_bias,
  license_policy,
  fetch_frequency,
  metadata
)
select
  'podcast',
  podcast_name,
  rss_url,
  'ja',
  array[category],
  null,
  case when has_transcript then 'excerpt_allowed' else 'metadata_only' end,
  'weekly',
  jsonb_build_object(
    'recommended_jlpt', recommended_jlpt,
    'has_transcript', has_transcript,
    'description', description
  )
from public.curated_podcasts
on conflict do nothing;
