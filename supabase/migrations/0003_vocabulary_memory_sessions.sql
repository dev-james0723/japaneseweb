-- Vocabulary memory scenes: multi-storyline sessions per deck (two-stage AI pipeline).

------------------------------------------------------------
-- vocabulary_sessions
------------------------------------------------------------
create table public.vocabulary_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  source_input text,
  extracted_vocabulary jsonb not null default '[]'::jsonb,
  planning_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vocabulary_sessions_user_id_idx on public.vocabulary_sessions(user_id);
create index vocabulary_sessions_deck_id_created_idx on public.vocabulary_sessions(deck_id, created_at desc);

------------------------------------------------------------
-- vocabulary_storyline_groups
------------------------------------------------------------
create table public.vocabulary_storyline_groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocabulary_sessions(id) on delete cascade,
  group_index integer not null,
  title_traditional_chinese text not null,
  storyline_japanese text not null,
  storyline_traditional_chinese text not null,
  words jsonb not null default '[]'::jsonb,
  image_prompt text not null,
  image_url text,
  storage_path text,
  model text,
  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'generating', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, group_index)
);

create index vocabulary_storyline_groups_session_id_idx on public.vocabulary_storyline_groups(session_id);

------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------
alter table public.vocabulary_sessions enable row level security;
alter table public.vocabulary_storyline_groups enable row level security;

create policy "own vocabulary sessions" on public.vocabulary_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own vocabulary storyline groups" on public.vocabulary_storyline_groups
  for all using (
    exists (
      select 1 from public.vocabulary_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vocabulary_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
