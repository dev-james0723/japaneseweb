-- Durable review-event ledger. The existing reviews table stores current SRS
-- state; this table preserves every retrieval as evidence for analytics,
-- recap generation, and future repair flows.

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null default current_date,
  reviewed_at timestamptz not null default now(),
  target_type text not null check (target_type in (
    'vocab',
    'sentence',
    'grammar',
    'roleplay_pattern',
    'output_repair'
  )),
  source_type text not null default 'review_session' check (source_type in (
    'review_session',
    'sentence_review',
    'shadowing',
    'memory_game',
    'weekly_quiz',
    'quick_output',
    'roleplay',
    'manual'
  )),
  vocab_id uuid references public.vocabulary_items(id) on delete set null,
  review_id uuid references public.reviews(id) on delete set null,
  sentence_review_prompt_id uuid references public.sentence_review_prompts(id) on delete set null,
  quiz_attempt_id uuid references public.quiz_attempts(id) on delete set null,
  deck_id uuid references public.decks(id) on delete set null,
  quiz_type text,
  prompt text,
  user_answer text,
  correct_answer text,
  is_correct boolean not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  schedule_before jsonb not null default '{}',
  schedule_after jsonb not null default '{}',
  skill_area text,
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'vocab' and vocab_id is not null)
    or (target_type = 'sentence' and sentence_review_prompt_id is not null)
    or target_type in ('grammar', 'roleplay_pattern', 'output_repair')
  )
);

create index if not exists review_events_user_reviewed_idx
  on public.review_events(user_id, reviewed_at desc);
create index if not exists review_events_user_date_target_idx
  on public.review_events(user_id, event_date desc, target_type);
create index if not exists review_events_user_correct_reviewed_idx
  on public.review_events(user_id, is_correct, reviewed_at desc);
create index if not exists review_events_vocab_idx
  on public.review_events(vocab_id, reviewed_at desc)
  where vocab_id is not null;
create index if not exists review_events_review_idx
  on public.review_events(review_id, reviewed_at desc)
  where review_id is not null;
create index if not exists review_events_sentence_prompt_idx
  on public.review_events(sentence_review_prompt_id, reviewed_at desc)
  where sentence_review_prompt_id is not null;
create index if not exists review_events_quiz_attempt_idx
  on public.review_events(quiz_attempt_id)
  where quiz_attempt_id is not null;
create index if not exists review_events_metadata_idx
  on public.review_events using gin (metadata);

drop trigger if exists review_events_updated_at on public.review_events;
create trigger review_events_updated_at
  before update on public.review_events
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.review_events to authenticated;

alter table public.review_events enable row level security;

drop policy if exists "select own review events" on public.review_events;
create policy "select own review events" on public.review_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own review events" on public.review_events;
create policy "insert own review events" on public.review_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own review events" on public.review_events;
create policy "update own review events" on public.review_events
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own review events" on public.review_events;
create policy "delete own review events" on public.review_events
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
