-- 🌸 Japanese OS — Phase 1 foundation
-- New tables for OS settings, daily boot logs, grammar, journal, self-talk,
-- Talk Me sessions, sentence mining, weekly reviews, monthly audits, and a
-- false-friend reference dataset. Also extends vocabulary_items + reviews
-- with trilingual leverage + FSRS-state columns.

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- user_os_settings
------------------------------------------------------------
create table if not exists public.user_os_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_phase int not null default 1 check (current_phase between 1 and 6),
  phase_started_at timestamptz not null default now(),
  target_jlpt text not null default 'N2',
  target_date date,
  weekly_new_vocab_quota int not null default 20,
  weekly_new_grammar_quota int not null default 2,
  daily_mode text not null default 'standard' check (daily_mode in ('min', 'standard', 'deep')),
  trilingual_leverage_enabled boolean not null default true,
  talk_me_integration_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------
-- os_boot_logs — one row per (user, date)
------------------------------------------------------------
create table if not exists public.os_boot_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  boot_date date not null,
  mode text not null check (mode in ('min', 'standard', 'deep')),
  boot_layer_done boolean not null default false,
  input_layer_done boolean not null default false,
  review_layer_done boolean not null default false,
  output_layer_done boolean not null default false,
  debug_layer_done boolean not null default false,
  talk_me_minutes int not null default 0,
  anki_due_completed int not null default 0,
  anki_due_total int not null default 0,
  new_cards_added int not null default 0,
  journal_sentences int not null default 0,
  total_minutes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, boot_date)
);
create index if not exists os_boot_logs_user_date_idx on public.os_boot_logs(user_id, boot_date desc);

------------------------------------------------------------
-- vocabulary_items — trilingual leverage + FSRS columns
------------------------------------------------------------
alter table public.vocabulary_items
  add column if not exists cantonese_reading text,
  add column if not exists has_kanji boolean not null default false,
  add column if not exists is_false_friend boolean not null default false,
  add column if not exists false_friend_warning text,
  add column if not exists trilingual_mnemonic text,
  add column if not exists common_mistake text,
  add column if not exists source_reference text,
  add column if not exists active_stage int not null default 1 check (active_stage between 1 and 4);
-- broaden source_type to include the new ingestion paths
alter table public.vocabulary_items drop constraint if exists vocabulary_items_source_type_check;
alter table public.vocabulary_items
  add constraint vocabulary_items_source_type_check
  check (source_type is null or source_type in (
    'manual', 'ocr', 'ai_generated', 'talk_me', 'nhk', 'youtube', 'sentence_mining', 'journal'
  ));

------------------------------------------------------------
-- reviews — FSRS algorithm state
------------------------------------------------------------
alter table public.reviews
  add column if not exists fsrs_state jsonb,
  add column if not exists next_review_at timestamptz,
  add column if not exists stability double precision,
  add column if not exists difficulty double precision,
  add column if not exists lapses int not null default 0,
  add column if not exists is_leech boolean not null default false;
create index if not exists reviews_user_next_review_at_idx on public.reviews(user_id, next_review_at);

------------------------------------------------------------
-- grammar_points
------------------------------------------------------------
create table if not exists public.grammar_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null,
  jlpt_level text check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  core_meaning text,
  construction text,
  similar_patterns text[] not null default '{}',
  common_mistake text,
  examples jsonb not null default '[]'::jsonb,
  mnemonic text,
  active_stage int not null default 1 check (active_stage between 1 and 4),
  fsrs_state jsonb,
  next_review_at timestamptz,
  stability double precision,
  difficulty double precision,
  source_type text,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists grammar_points_user_next_idx on public.grammar_points(user_id, next_review_at);
create index if not exists grammar_points_user_pattern_idx on public.grammar_points(user_id, pattern);

------------------------------------------------------------
-- journal_entries
------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  content_ja text not null,
  ai_corrections jsonb,
  ai_natural_version text,
  notice_gap_learnings text[] not null default '{}',
  sentence_count int,
  word_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_entries_user_date_idx on public.journal_entries(user_id, entry_date desc);

------------------------------------------------------------
-- self_talk_progressions — quick-log of self-talk moments
------------------------------------------------------------
create table if not exists public.self_talk_progressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  stage_level int not null check (stage_level between 1 and 4),
  sample_phrase text,
  context text check (context is null or context in ('morning', 'commute', 'work', 'night', 'other')),
  created_at timestamptz not null default now()
);
create index if not exists self_talk_user_date_idx on public.self_talk_progressions(user_id, log_date desc);

------------------------------------------------------------
-- talk_me_sessions
------------------------------------------------------------
create table if not exists public.talk_me_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  duration_minutes int,
  lessons_completed text[] not null default '{}',
  most_useful_sentence text,
  artifact_saved boolean not null default false,
  shadowing_done boolean not null default false,
  conversation_mode_done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists talk_me_user_date_idx on public.talk_me_sessions(user_id, session_date desc);

------------------------------------------------------------
-- mined_sentences
------------------------------------------------------------
create table if not exists public.mined_sentences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text check (source_type in ('nhk', 'youtube', 'talk_me', 'manual', 'podcast', 'article', 'other')),
  source_url text,
  source_title text,
  sentence_ja text not null,
  kana_reading text,
  translation_zh text,
  difficulty_jlpt text check (difficulty_jlpt is null or difficulty_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1')),
  key_vocab text[] not null default '{}',
  key_grammar text[] not null default '{}',
  cloze_target text,
  vocab_id uuid references public.vocabulary_items(id) on delete set null,
  mined_at timestamptz not null default now()
);
create index if not exists mined_sentences_user_idx on public.mined_sentences(user_id, mined_at desc);

------------------------------------------------------------
-- weekly_reviews
------------------------------------------------------------
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  new_vocab_added int not null default 0,
  new_grammar_added int not null default 0,
  anki_completion_rate real,
  talk_me_days int not null default 0,
  boot_days int not null default 0,
  most_useful_vocab text[] not null default '{}',
  most_useful_grammar text[] not null default '{}',
  leech_vocab_ids uuid[] not null default '{}',
  ai_generated_quiz jsonb,
  user_reflection text,
  next_week_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

------------------------------------------------------------
-- monthly_audits
------------------------------------------------------------
create table if not exists public.monthly_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  cumulative_vocab_count int,
  jlpt_mock_scores jsonb,                  -- {vocab, grammar, reading, listening}
  self_assessment jsonb,                   -- user-rated subjective scores
  planning_rating int,
  journal_avg_sentences real,
  talk_me_naturalness int,
  os_boot_rate real,                       -- 0..1
  biggest_progress text,
  biggest_bottleneck text,
  next_month_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start)
);

------------------------------------------------------------
-- false_friends_reference — global lookup, not per-user
------------------------------------------------------------
create table if not exists public.false_friends_reference (
  id uuid primary key default gen_random_uuid(),
  kanji text not null unique,
  chinese_meaning text not null,
  japanese_meaning text not null,
  example_ja text,
  severity text not null default 'high' check (severity in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

insert into public.false_friends_reference (kanji, chinese_meaning, japanese_meaning, example_ja, severity) values
  ('勉強', '勉勵、強迫', '學習', '毎日日本語を勉強しています。', 'high'),
  ('手紙', '廁紙', '信件', '友達から手紙をもらった。', 'high'),
  ('大丈夫', '男子漢、大丈夫之氣概', '沒問題、不要緊', '大丈夫ですか？', 'high'),
  ('怪我', '責怪我', '受傷', '転んで怪我をした。', 'high'),
  ('娘', '母親', '女兒', '私の娘は五歳です。', 'high'),
  ('切手', '切到手', '郵票', '切手を貼ってください。', 'high'),
  ('約束', '約束、限制', '約定、承諾', '約束を守ります。', 'medium'),
  ('喧嘩', '喧嘩吵鬧', '吵架、打架', '兄弟で喧嘩した。', 'medium'),
  ('愛人', '配偶、戀人', '情婦、外遇對象', '彼には愛人がいる。', 'high'),
  ('湯', '熱湯/喝的湯', '熱水、洗澡水', 'お湯を沸かす。', 'high'),
  ('丈夫', '老公', '結實、堅固', 'この椅子は丈夫だ。', 'high'),
  ('床', '床鋪', '地板', '床に座る。', 'high'),
  ('暗算', '心裡盤算害人', '心算', '暗算が得意です。', 'medium'),
  ('真面目', '真實面目', '認真、正經', '真面目な学生。', 'high'),
  ('得意', '得意、自滿', '擅長、拿手', '料理が得意だ。', 'medium'),
  ('迷惑', '迷惘困惑', '困擾、麻煩到別人', 'ご迷惑をおかけしました。', 'high'),
  ('我慢', '我很慢', '忍耐', 'もう我慢できない。', 'high'),
  ('邪魔', '邪魔歪道', '打擾、妨礙', 'お邪魔します。', 'high'),
  ('勝手', '勝者之手', '隨便、自顧自', '勝手にしないで。', 'medium'),
  ('結構', '結構、架構', '相當、不用了', '結構です。', 'medium')
on conflict (kanji) do nothing;

------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------
alter table public.user_os_settings        enable row level security;
alter table public.os_boot_logs            enable row level security;
alter table public.grammar_points          enable row level security;
alter table public.journal_entries         enable row level security;
alter table public.self_talk_progressions  enable row level security;
alter table public.talk_me_sessions        enable row level security;
alter table public.mined_sentences         enable row level security;
alter table public.weekly_reviews          enable row level security;
alter table public.monthly_audits          enable row level security;
alter table public.false_friends_reference enable row level security;

drop policy if exists "own os settings" on public.user_os_settings;
create policy "own os settings" on public.user_os_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own boot logs" on public.os_boot_logs;
create policy "own boot logs" on public.os_boot_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own grammar" on public.grammar_points;
create policy "own grammar" on public.grammar_points
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own journal" on public.journal_entries;
create policy "own journal" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own self talk" on public.self_talk_progressions;
create policy "own self talk" on public.self_talk_progressions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own talk me sessions" on public.talk_me_sessions;
create policy "own talk me sessions" on public.talk_me_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own mined sentences" on public.mined_sentences;
create policy "own mined sentences" on public.mined_sentences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own weekly reviews" on public.weekly_reviews;
create policy "own weekly reviews" on public.weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own monthly audits" on public.monthly_audits;
create policy "own monthly audits" on public.monthly_audits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- false_friends_reference: global read for any authenticated user, no writes from clients
drop policy if exists "read false friends" on public.false_friends_reference;
create policy "read false friends" on public.false_friends_reference
  for select using (auth.role() = 'authenticated');

------------------------------------------------------------
-- Auto-create user_os_settings on signup (extends existing trigger)
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

  return new;
end;
$$;

-- Backfill os_settings for any existing users
insert into public.user_os_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
