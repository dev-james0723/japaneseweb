-- Sentence-based review prompts generated from mined sentences.
-- This keeps vocabulary reviews intact while allowing cloze, listening,
-- production, and shadowing prompts to use the same adaptive schedule shape.

create table if not exists public.sentence_review_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mined_sentence_id uuid not null references public.mined_sentences(id) on delete cascade,
  prompt_type text not null check (prompt_type in ('cloze', 'listening', 'production', 'shadowing')),
  prompt text not null,
  answer text not null,
  sentence_ja text not null,
  kana_reading text,
  translation_zh text,
  difficulty_jlpt text check (difficulty_jlpt is null or difficulty_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1')),
  key_vocab text[] not null default '{}',
  key_grammar text[] not null default '{}',
  review_date date,
  next_review_date date not null default current_date,
  next_review_at timestamptz,
  review_count int not null default 0,
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  ease_score real,
  status text not null default 'new',
  stability double precision,
  difficulty double precision,
  lapses int not null default 0,
  is_leech boolean not null default false,
  fsrs_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mined_sentence_id, prompt_type)
);

create index if not exists sentence_review_prompts_user_next_idx
  on public.sentence_review_prompts(user_id, next_review_date, is_leech desc);
create index if not exists sentence_review_prompts_mined_sentence_idx
  on public.sentence_review_prompts(mined_sentence_id);

alter table public.sentence_review_prompts enable row level security;

drop policy if exists "own sentence review prompts" on public.sentence_review_prompts;
create policy "own sentence review prompts" on public.sentence_review_prompts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
