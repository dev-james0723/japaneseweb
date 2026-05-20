-- 🌸 Cultural Media Hub — Phase 7.1
-- Articles, videos, podcasts, user interactions, preferences, and curated sources.

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- cultural_contents — system-curated (user_id null) or personal saves
------------------------------------------------------------
create table if not exists public.cultural_contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('article', 'video', 'podcast', 'news')),
  category text not null check (category in (
    'history_festivals',
    'language_history',
    'pop_culture',
    'traditional_arts',
    'regional_culture',
    'news_current',
    'lifestyle_niche'
  )),

  title_ja text not null,
  title_zh text not null,
  difficulty_jlpt text check (difficulty_jlpt is null or difficulty_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1')),
  estimated_minutes int,

  body_ja text,
  body_zh text,
  body_paragraphs jsonb,

  youtube_video_id text,
  youtube_channel_title text,
  youtube_thumbnail_url text,

  podcast_audio_url text,
  podcast_episode_title text,
  podcast_show_name text,

  source_url text,
  source_name text,
  thumbnail_url text,
  ai_summary_zh text,
  ai_summary_ja text,

  key_vocab jsonb not null default '[]'::jsonb,
  key_grammar jsonb not null default '[]'::jsonb,
  cultural_notes text,
  cantonese_lens text,

  is_daily_pick boolean not null default false,
  daily_pick_date date,

  created_at timestamptz not null default now(),

  constraint cultural_contents_youtube_user_unique unique (youtube_video_id, user_id),
  constraint cultural_contents_podcast_user_unique unique (podcast_audio_url, user_id)
);

create index if not exists idx_cultural_contents_user_date
  on public.cultural_contents(user_id, daily_pick_date desc);
create index if not exists idx_cultural_contents_category
  on public.cultural_contents(category);
create index if not exists idx_cultural_contents_type
  on public.cultural_contents(content_type);
create index if not exists idx_cultural_contents_daily_pick
  on public.cultural_contents(user_id, daily_pick_date)
  where is_daily_pick = true;

------------------------------------------------------------
-- cultural_interactions — opens, completions, saves, deck/journal links
------------------------------------------------------------
create table if not exists public.cultural_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.cultural_contents(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('opened', 'completed', 'saved', 'shared')),
  read_progress real not null default 0 check (read_progress >= 0 and read_progress <= 1),
  time_spent_seconds int not null default 0,

  vocab_added_ids uuid[] not null default '{}',
  sentences_mined_ids uuid[] not null default '{}',
  journal_entry_id uuid references public.journal_entries(id) on delete set null,

  notes text,
  rating int check (rating is null or (rating >= 1 and rating <= 5)),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cultural_interactions_user
  on public.cultural_interactions(user_id, created_at desc);
create index if not exists idx_cultural_interactions_content
  on public.cultural_interactions(content_id);

------------------------------------------------------------
-- cultural_preferences — per-user hub settings
------------------------------------------------------------
create table if not exists public.cultural_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_categories text[] not null default '{}',
  avoided_categories text[] not null default '{}',
  preferred_channels text[] not null default '{}',
  preferred_podcasts text[] not null default '{}',
  daily_push_enabled boolean not null default true,
  daily_push_time time not null default '08:00',
  daily_push_category_rotation boolean not null default true,
  last_pushed_category text check (last_pushed_category is null or last_pushed_category in (
    'history_festivals',
    'language_history',
    'pop_culture',
    'traditional_arts',
    'regional_culture',
    'news_current',
    'lifestyle_niche'
  )),
  language_blend_override text check (language_blend_override is null or language_blend_override in (
    'full_ja', 'bilingual', 'zh_heavy'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------
-- curated_channels — global reference (read-only for clients)
------------------------------------------------------------
create table if not exists public.curated_channels (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null unique,
  channel_name text not null,
  category text not null check (category in (
    'history_festivals',
    'language_history',
    'pop_culture',
    'traditional_arts',
    'regional_culture',
    'news_current',
    'lifestyle_niche'
  )),
  recommended_jlpt text,
  has_jp_subs boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

insert into public.curated_channels (channel_id, channel_name, category, recommended_jlpt, has_jp_subs, description) values
  ('UC4FagPqf68tFFlEKWfDoIzg', 'Nihongo no Mori', 'language_history', 'N3-N1', true, 'JLPT 級語法／文化講解'),
  ('UCAY3Ki9aJaaG8pXh4QHTU3w', 'Comprehensible Japanese', 'pop_culture', 'N5-N3', true, 'Pure 日文 comprehensible input'),
  ('UCNUx9bQyEI0k6CTpxAHWu2A', 'Bilingual News', 'news_current', 'N3-N1', true, '日英雙語新聞 podcast'),
  ('UCwXdFgeE9KYzlDdR7TG9cMw', 'NHK World-Japan', 'history_festivals', 'N3-N2', false, 'NHK 官方文化／歷史紀錄片'),
  ('UCfRQzjzWAlMQDC8N-WqWJjg', 'Game Gym', 'pop_culture', 'N4-N3', true, '日本生活 vlog'),
  ('UCpDJl2EmP7Oh90Vylx0dZtA', 'Yuyu Nihongo', 'language_history', 'N4-N3', true, '日文老師講語言歷史'),
  ('UCQrMNg2_-vmRH7nFB8w-PYg', 'TabiEats', 'lifestyle_niche', 'N4-N2', false, '日本食／旅遊')
on conflict (channel_id) do nothing;

------------------------------------------------------------
-- curated_podcasts — global reference (read-only for clients)
------------------------------------------------------------
create table if not exists public.curated_podcasts (
  id uuid primary key default gen_random_uuid(),
  podcast_name text not null,
  rss_url text not null unique,
  category text not null check (category in (
    'history_festivals',
    'language_history',
    'pop_culture',
    'traditional_arts',
    'regional_culture',
    'news_current',
    'lifestyle_niche'
  )),
  recommended_jlpt text,
  has_transcript boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

insert into public.curated_podcasts (podcast_name, rss_url, category, recommended_jlpt, has_transcript, description) values
  ('Nihongo con Teppei', 'https://anchor.fm/s/4cd964/podcast/rss', 'pop_culture', 'N4-N3', false, '簡單日常日文 podcast'),
  ('NHK Radio News', 'https://www.nhk.or.jp/rj/podcast/rss/japanese.xml', 'news_current', 'N2-N1', true, 'NHK 官方新聞'),
  ('Bilingual News', 'https://feeds.megaphone.fm/bilingualnews', 'news_current', 'N3-N1', false, '日英雙語熱話'),
  ('Learn Japanese Pod', 'https://feeds.libsyn.com/3578/rss', 'language_history', 'N4-N2', true, '語法／文化深入講解'),
  ('Sakura Tips', 'https://feed.podbean.com/sakuratips/feed.xml', 'traditional_arts', 'N3-N2', false, '茶道、禪、傳統藝術')
on conflict (rss_url) do nothing;

------------------------------------------------------------
-- updated_at triggers (reuse notebook helper if present)
------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create unique index if not exists idx_cultural_daily_pick_unique
  on public.cultural_contents (user_id, daily_pick_date)
  where is_daily_pick = true and daily_pick_date is not null and user_id is not null;

grant select, insert, update, delete on public.cultural_contents to authenticated;
grant select, insert, update, delete on public.cultural_interactions to authenticated;
grant select, insert, update, delete on public.cultural_preferences to authenticated;
grant select on public.curated_channels to authenticated;
grant select on public.curated_podcasts to authenticated;

drop trigger if exists cultural_interactions_updated_at on public.cultural_interactions;
create trigger cultural_interactions_updated_at
  before update on public.cultural_interactions
  for each row execute function public.set_updated_at();

drop trigger if exists cultural_preferences_updated_at on public.cultural_preferences;
create trigger cultural_preferences_updated_at
  before update on public.cultural_preferences
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------
alter table public.cultural_contents enable row level security;
alter table public.cultural_interactions enable row level security;
alter table public.cultural_preferences enable row level security;
alter table public.curated_channels enable row level security;
alter table public.curated_podcasts enable row level security;

drop policy if exists "view own and system cultural content" on public.cultural_contents;
create policy "view own and system cultural content" on public.cultural_contents
  for select using (user_id is null or user_id = auth.uid());

drop policy if exists "insert own cultural content" on public.cultural_contents;
create policy "insert own cultural content" on public.cultural_contents
  for insert with check (user_id = auth.uid());

drop policy if exists "update own cultural content" on public.cultural_contents;
create policy "update own cultural content" on public.cultural_contents
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own cultural content" on public.cultural_contents;
create policy "delete own cultural content" on public.cultural_contents
  for delete using (user_id = auth.uid());

drop policy if exists "own cultural interactions" on public.cultural_interactions;
create policy "own cultural interactions" on public.cultural_interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own cultural preferences" on public.cultural_preferences;
create policy "own cultural preferences" on public.cultural_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read curated channels" on public.curated_channels;
create policy "read curated channels" on public.curated_channels
  for select using (auth.role() = 'authenticated');

drop policy if exists "read curated podcasts" on public.curated_podcasts;
create policy "read curated podcasts" on public.curated_podcasts
  for select using (auth.role() = 'authenticated');

------------------------------------------------------------
-- Auto-create cultural_preferences on signup
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_os_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.cultural_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

insert into public.cultural_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Extend vocabulary source_type for cultural hub ingestion
alter table public.vocabulary_items drop constraint if exists vocabulary_items_source_type_check;
alter table public.vocabulary_items
  add constraint vocabulary_items_source_type_check
  check (source_type is null or source_type in (
    'manual', 'ocr', 'ai_generated', 'talk_me', 'nhk', 'youtube', 'sentence_mining', 'journal',
    'cultural_article', 'cultural_video', 'cultural_podcast'
  ));

alter table public.mined_sentences drop constraint if exists mined_sentences_source_type_check;
alter table public.mined_sentences
  add constraint mined_sentences_source_type_check
  check (source_type is null or source_type in (
    'nhk', 'youtube', 'talk_me', 'manual', 'podcast', 'article', 'other',
    'cultural_article', 'cultural_video', 'cultural_podcast'
  ));
