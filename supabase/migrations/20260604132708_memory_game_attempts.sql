-- First-class Memory Engine analytics. Generic quiz_attempts still keeps the
-- broad review stream, while this table preserves game-specific evidence such
-- as response time, mechanism, and linked sentence prompt.

create table if not exists public.memory_game_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_date date not null default current_date,
  game_type text not null check (game_type in (
    'kana_kanji_snap',
    'sentence_rebuild',
    'grammar_duel',
    'cloze_attack',
    'shadow_loop',
    'mistake_doctor',
    'context_match',
    'memory_palace',
    'conversation_next_line',
    'news_recall'
  )),
  sentence_review_prompt_id uuid references public.sentence_review_prompts(id) on delete set null,
  quiz_attempt_id uuid references public.quiz_attempts(id) on delete set null,
  skill_area text not null check (skill_area in (
    'vocab_recognition',
    'vocab_production',
    'kanji',
    'sentence_cloze',
    'sentence_production',
    'grammar',
    'listening',
    'shadowing',
    'pragmatics',
    'output'
  )),
  difficulty_jlpt text check (difficulty_jlpt is null or difficulty_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1')),
  prompt text not null,
  user_answer text,
  correct_answer text not null,
  is_correct boolean not null,
  response_time_ms int check (response_time_ms is null or response_time_ms >= 0),
  explanation text,
  grammar_tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_game_attempts_user_created_idx
  on public.memory_game_attempts(user_id, created_at desc);
create index if not exists memory_game_attempts_user_game_created_idx
  on public.memory_game_attempts(user_id, game_type, created_at desc);
create index if not exists memory_game_attempts_user_correct_created_idx
  on public.memory_game_attempts(user_id, is_correct, created_at desc);
create index if not exists memory_game_attempts_prompt_idx
  on public.memory_game_attempts(sentence_review_prompt_id)
  where sentence_review_prompt_id is not null;

drop trigger if exists memory_game_attempts_updated_at on public.memory_game_attempts;
create trigger memory_game_attempts_updated_at
  before update on public.memory_game_attempts
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.memory_game_attempts to authenticated;

alter table public.memory_game_attempts enable row level security;

drop policy if exists "own memory game attempts" on public.memory_game_attempts;
create policy "own memory game attempts" on public.memory_game_attempts
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
