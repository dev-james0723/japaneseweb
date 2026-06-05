-- Normalized Daily Feed lesson assets. The original daily_lessons row keeps a
-- compact packet for fast rendering, while these tables make sections,
-- sentences, vocabulary, and grammar queryable as durable learning assets.

create table if not exists public.daily_lesson_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_lesson_id uuid not null references public.daily_lessons(id) on delete cascade,
  section_type text not null check (
    section_type in (
      'hook',
      'easy_summary',
      'original_snippet',
      'sentence_mining',
      'vocab_grammar',
      'shadowing',
      'output_mission',
      'source_notes'
    )
  ),
  title text not null,
  body_ja text,
  body_zh text,
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (daily_lesson_id, section_type)
);

create table if not exists public.lesson_sentences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_lesson_id uuid not null references public.daily_lessons(id) on delete cascade,
  mined_sentence_id uuid references public.mined_sentences(id) on delete set null,
  sentence_review_prompt_id uuid references public.sentence_review_prompts(id) on delete set null,
  sentence_type text not null default 'mining' check (
    sentence_type in ('mining', 'shadowing', 'output_model', 'example')
  ),
  sentence_ja text not null,
  kana_reading text,
  translation_zh text,
  difficulty_jlpt text check (difficulty_jlpt is null or difficulty_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1')),
  key_vocab text[] not null default '{}',
  key_grammar text[] not null default '{}',
  cloze_target text,
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (daily_lesson_id, sentence_type, sentence_ja)
);

create table if not exists public.lesson_vocab (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_lesson_id uuid not null references public.daily_lessons(id) on delete cascade,
  vocab_id uuid references public.vocabulary_items(id) on delete set null,
  term text not null,
  reading text,
  meaning_zh text,
  jlpt_level text check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  example_sentence text,
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (daily_lesson_id, term)
);

create table if not exists public.lesson_grammar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_lesson_id uuid not null references public.daily_lessons(id) on delete cascade,
  grammar_point_id uuid references public.grammar_points(id) on delete set null,
  pattern text not null,
  meaning_zh text,
  construction text,
  example_ja text,
  jlpt_level text check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (daily_lesson_id, pattern)
);

create index if not exists daily_lesson_sections_user_lesson_idx
  on public.daily_lesson_sections(user_id, daily_lesson_id, sort_order);
create index if not exists lesson_sentences_user_lesson_idx
  on public.lesson_sentences(user_id, daily_lesson_id, sort_order);
create index if not exists lesson_sentences_review_prompt_idx
  on public.lesson_sentences(sentence_review_prompt_id)
  where sentence_review_prompt_id is not null;
create index if not exists lesson_vocab_user_lesson_idx
  on public.lesson_vocab(user_id, daily_lesson_id, sort_order);
create index if not exists lesson_vocab_vocab_idx
  on public.lesson_vocab(vocab_id)
  where vocab_id is not null;
create index if not exists lesson_grammar_user_lesson_idx
  on public.lesson_grammar(user_id, daily_lesson_id, sort_order);
create index if not exists lesson_grammar_point_idx
  on public.lesson_grammar(grammar_point_id)
  where grammar_point_id is not null;

grant select, insert, update, delete on public.daily_lesson_sections to authenticated;
grant select, insert, update, delete on public.lesson_sentences to authenticated;
grant select, insert, update, delete on public.lesson_vocab to authenticated;
grant select, insert, update, delete on public.lesson_grammar to authenticated;

drop trigger if exists daily_lesson_sections_updated_at on public.daily_lesson_sections;
create trigger daily_lesson_sections_updated_at
  before update on public.daily_lesson_sections
  for each row execute function public.set_updated_at();

drop trigger if exists lesson_sentences_updated_at on public.lesson_sentences;
create trigger lesson_sentences_updated_at
  before update on public.lesson_sentences
  for each row execute function public.set_updated_at();

drop trigger if exists lesson_vocab_updated_at on public.lesson_vocab;
create trigger lesson_vocab_updated_at
  before update on public.lesson_vocab
  for each row execute function public.set_updated_at();

drop trigger if exists lesson_grammar_updated_at on public.lesson_grammar;
create trigger lesson_grammar_updated_at
  before update on public.lesson_grammar
  for each row execute function public.set_updated_at();

alter table public.daily_lesson_sections enable row level security;
alter table public.lesson_sentences enable row level security;
alter table public.lesson_vocab enable row level security;
alter table public.lesson_grammar enable row level security;

drop policy if exists "own daily lesson sections" on public.daily_lesson_sections;
create policy "own daily lesson sections" on public.daily_lesson_sections
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own lesson sentences" on public.lesson_sentences;
create policy "own lesson sentences" on public.lesson_sentences
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own lesson vocab" on public.lesson_vocab;
create policy "own lesson vocab" on public.lesson_vocab
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own lesson grammar" on public.lesson_grammar;
create policy "own lesson grammar" on public.lesson_grammar
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
