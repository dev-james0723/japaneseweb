-- Grammar evidence ledger and per-pattern mastery rollup. This separates
-- "a grammar note exists" from "the learner has noticed, retrieved, repaired,
-- and produced the pattern under pressure."

create table if not exists public.grammar_exposures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grammar_point_id uuid references public.grammar_points(id) on delete set null,
  pattern text not null,
  jlpt_level text check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  exposure_type text not null check (
    exposure_type in (
      'notice',
      'recognition',
      'production',
      'correction',
      'contrast',
      'review',
      'shadow',
      'output',
      'mine',
      'manual'
    )
  ),
  result text not null default 'seen' check (
    result in ('seen', 'correct', 'hard', 'miss', 'leech', 'repaired', 'produced')
  ),
  source_surface text not null default 'unknown' check (
    length(source_surface) >= 1 and length(source_surface) <= 80
  ),
  source_reference text,
  daily_lesson_id uuid references public.daily_lessons(id) on delete set null,
  sentence_review_prompt_id uuid references public.sentence_review_prompts(id) on delete set null,
  mined_sentence_id uuid references public.mined_sentences(id) on delete set null,
  weakness_event_id uuid references public.weakness_events(id) on delete set null,
  roleplay_session_id uuid references public.roleplay_sessions(id) on delete set null,
  evidence_text text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grammar_exposures_user_created_idx
  on public.grammar_exposures(user_id, created_at desc);
create index if not exists grammar_exposures_user_pattern_created_idx
  on public.grammar_exposures(user_id, pattern, created_at desc);
create index if not exists grammar_exposures_user_type_result_idx
  on public.grammar_exposures(user_id, exposure_type, result, created_at desc);
create index if not exists grammar_exposures_grammar_point_idx
  on public.grammar_exposures(grammar_point_id, created_at desc)
  where grammar_point_id is not null;
create index if not exists grammar_exposures_sentence_prompt_idx
  on public.grammar_exposures(sentence_review_prompt_id, created_at desc)
  where sentence_review_prompt_id is not null;
create index if not exists grammar_exposures_metadata_idx
  on public.grammar_exposures using gin (metadata);

create table if not exists public.grammar_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grammar_point_id uuid references public.grammar_points(id) on delete set null,
  pattern text not null,
  jlpt_level text check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  mastery_score int not null default 0 check (mastery_score between 0 and 100),
  active_stage int not null default 1 check (active_stage between 1 and 4),
  exposure_count int not null default 0 check (exposure_count >= 0),
  notice_count int not null default 0 check (notice_count >= 0),
  recognition_count int not null default 0 check (recognition_count >= 0),
  production_count int not null default 0 check (production_count >= 0),
  correction_count int not null default 0 check (correction_count >= 0),
  contrast_count int not null default 0 check (contrast_count >= 0),
  review_count int not null default 0 check (review_count >= 0),
  correct_count int not null default 0 check (correct_count >= 0),
  hard_count int not null default 0 check (hard_count >= 0),
  miss_count int not null default 0 check (miss_count >= 0),
  leech_count int not null default 0 check (leech_count >= 0),
  repaired_count int not null default 0 check (repaired_count >= 0),
  last_seen_at timestamptz,
  last_correct_at timestamptz,
  last_missed_at timestamptz,
  last_produced_at timestamptz,
  evidence_summary text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pattern)
);

create index if not exists grammar_mastery_user_score_idx
  on public.grammar_mastery(user_id, mastery_score desc, updated_at desc);
create index if not exists grammar_mastery_user_stage_idx
  on public.grammar_mastery(user_id, active_stage, updated_at desc);
create index if not exists grammar_mastery_grammar_point_idx
  on public.grammar_mastery(grammar_point_id)
  where grammar_point_id is not null;

grant select, insert, update, delete on public.grammar_exposures to authenticated;
grant select, insert, update, delete on public.grammar_mastery to authenticated;

drop trigger if exists grammar_exposures_updated_at on public.grammar_exposures;
create trigger grammar_exposures_updated_at
  before update on public.grammar_exposures
  for each row execute function public.set_updated_at();

drop trigger if exists grammar_mastery_updated_at on public.grammar_mastery;
create trigger grammar_mastery_updated_at
  before update on public.grammar_mastery
  for each row execute function public.set_updated_at();

alter table public.grammar_exposures enable row level security;
alter table public.grammar_mastery enable row level security;

drop policy if exists "select own grammar exposures" on public.grammar_exposures;
create policy "select own grammar exposures" on public.grammar_exposures
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own grammar exposures" on public.grammar_exposures;
create policy "insert own grammar exposures" on public.grammar_exposures
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own grammar exposures" on public.grammar_exposures;
create policy "update own grammar exposures" on public.grammar_exposures
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own grammar exposures" on public.grammar_exposures;
create policy "delete own grammar exposures" on public.grammar_exposures
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "select own grammar mastery" on public.grammar_mastery;
create policy "select own grammar mastery" on public.grammar_mastery
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own grammar mastery" on public.grammar_mastery;
create policy "insert own grammar mastery" on public.grammar_mastery
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own grammar mastery" on public.grammar_mastery;
create policy "update own grammar mastery" on public.grammar_mastery
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own grammar mastery" on public.grammar_mastery;
create policy "delete own grammar mastery" on public.grammar_mastery
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
