-- Persist roleplay sessions as learning evidence instead of leaving them as
-- temporary client chat state.

create table if not exists public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text,
  scenario text not null,
  partner_role text not null,
  difficulty text not null check (difficulty in ('N5', 'N4', 'N3', 'N2', 'N1')),
  can_do text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  task_complete boolean not null default false,
  score int check (score is null or (score >= 0 and score <= 100)),
  best_sentence text,
  biggest_grammar_issue text,
  reusable_patterns text[] not null default '{}',
  next_assignment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roleplay_sessions_user_started_idx
  on public.roleplay_sessions(user_id, started_at desc);
create index if not exists roleplay_sessions_user_mission_idx
  on public.roleplay_sessions(user_id, mission_id, started_at desc);

create table if not exists public.roleplay_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  speaker text not null check (speaker in ('user', 'ai')),
  text_ja text not null,
  kana text,
  translation_zh text,
  correction_json jsonb,
  reusable_patterns text[] not null default '{}',
  rubric jsonb,
  task_complete boolean,
  created_at timestamptz not null default now()
);

create index if not exists roleplay_turns_session_created_idx
  on public.roleplay_turns(session_id, created_at);
create index if not exists roleplay_turns_user_created_idx
  on public.roleplay_turns(user_id, created_at desc);

create table if not exists public.roleplay_corrections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  turn_id uuid references public.roleplay_turns(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  original text not null,
  corrected text not null,
  explanation_zh text,
  saved_to_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists roleplay_corrections_user_created_idx
  on public.roleplay_corrections(user_id, created_at desc);

create table if not exists public.roleplay_reusable_patterns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  turn_id uuid references public.roleplay_turns(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null,
  saved_to_review boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, pattern)
);

create index if not exists roleplay_patterns_user_created_idx
  on public.roleplay_reusable_patterns(user_id, created_at desc);

create table if not exists public.roleplay_evidence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_do_id text,
  proof_text text not null,
  score int check (score is null or (score >= 0 and score <= 100)),
  saved_to_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists roleplay_evidence_user_created_idx
  on public.roleplay_evidence(user_id, created_at desc);

grant select, insert, update, delete on public.roleplay_sessions to authenticated;
grant select, insert, update, delete on public.roleplay_turns to authenticated;
grant select, insert, update, delete on public.roleplay_corrections to authenticated;
grant select, insert, update, delete on public.roleplay_reusable_patterns to authenticated;
grant select, insert, update, delete on public.roleplay_evidence to authenticated;

alter table public.roleplay_sessions enable row level security;
alter table public.roleplay_turns enable row level security;
alter table public.roleplay_corrections enable row level security;
alter table public.roleplay_reusable_patterns enable row level security;
alter table public.roleplay_evidence enable row level security;

drop policy if exists "own roleplay sessions" on public.roleplay_sessions;
create policy "own roleplay sessions" on public.roleplay_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own roleplay turns" on public.roleplay_turns;
create policy "own roleplay turns" on public.roleplay_turns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own roleplay corrections" on public.roleplay_corrections;
create policy "own roleplay corrections" on public.roleplay_corrections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own roleplay patterns" on public.roleplay_reusable_patterns;
create policy "own roleplay patterns" on public.roleplay_reusable_patterns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own roleplay evidence" on public.roleplay_evidence;
create policy "own roleplay evidence" on public.roleplay_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
