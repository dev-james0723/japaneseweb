-- Persist review mistakes as first-class learning signals. These rows power
-- weak-area analytics and later repair flows without coupling them to one card
-- table.

create table if not exists public.weakness_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null default current_date,
  source text not null check (source in (
    'review',
    'sentence_review',
    'weekly_review',
    'roleplay',
    'journal',
    'grammar'
  )),
  skill_area text not null check (skill_area in (
    'vocab_recognition',
    'vocab_production',
    'listening',
    'sentence_cloze',
    'sentence_production',
    'shadowing',
    'grammar',
    'kanji',
    'pronunciation',
    'pragmatics',
    'output'
  )),
  severity text not null check (severity in ('hard', 'miss', 'leech')),
  vocab_id uuid references public.vocabulary_items(id) on delete set null,
  sentence_review_prompt_id uuid references public.sentence_review_prompts(id) on delete set null,
  prompt text,
  user_answer text,
  correct_answer text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'review' and vocab_id is not null)
    or (source = 'sentence_review' and sentence_review_prompt_id is not null)
    or source in ('weekly_review', 'roleplay', 'journal', 'grammar')
  )
);

create index if not exists weakness_events_user_created_idx
  on public.weakness_events(user_id, created_at desc);
create index if not exists weakness_events_user_skill_created_idx
  on public.weakness_events(user_id, skill_area, created_at desc);
create index if not exists weakness_events_user_severity_created_idx
  on public.weakness_events(user_id, severity, created_at desc);

grant select, insert, update, delete on public.weakness_events to authenticated;

alter table public.weakness_events enable row level security;

drop policy if exists "own weakness events" on public.weakness_events;
create policy "own weakness events" on public.weakness_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
