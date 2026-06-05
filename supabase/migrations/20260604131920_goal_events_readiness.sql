-- Auditable Progress Engine tables. Goal events explain why the learning
-- contract changed; JLPT readiness snapshots preserve evidence-backed progress
-- estimates over time.

create table if not exists public.goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_goal_id uuid references public.user_goals(id) on delete set null,
  event_date date not null default current_date,
  event_type text not null check (event_type in (
    'goal_created',
    'goal_updated',
    'plan_adjusted',
    'phase_advanced',
    'readiness_snapshot',
    'weekly_reflection',
    'monthly_audit',
    'manual_note'
  )),
  title text not null,
  detail text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists goal_events_user_created_idx
  on public.goal_events(user_id, created_at desc);
create index if not exists goal_events_goal_created_idx
  on public.goal_events(user_goal_id, created_at desc)
  where user_goal_id is not null;
create index if not exists goal_events_user_type_created_idx
  on public.goal_events(user_id, event_type, created_at desc);

create table if not exists public.jlpt_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_goal_id uuid not null references public.user_goals(id) on delete cascade,
  target_level text not null check (target_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  snapshot_date date not null default current_date,
  readiness_score int not null check (readiness_score between 0 and 100),
  vocabulary_score int not null default 0 check (vocabulary_score between 0 and 100),
  grammar_score int not null default 0 check (grammar_score between 0 and 100),
  reading_score int not null default 0 check (reading_score between 0 and 100),
  listening_score int not null default 0 check (listening_score between 0 and 100),
  output_score int not null default 0 check (output_score between 0 and 100),
  consistency_score int not null default 0 check (consistency_score between 0 and 100),
  projected_ready_date date,
  days_until_deadline int,
  pace_status text not null default 'no_deadline' check (pace_status in (
    'ahead',
    'on_track',
    'behind',
    'no_deadline'
  )),
  evidence jsonb not null default '{}',
  source text not null default 'computed' check (source in (
    'computed',
    'weekly_review',
    'monthly_audit',
    'manual'
  )),
  created_at timestamptz not null default now(),
  unique (user_id, user_goal_id, snapshot_date, source)
);

create index if not exists jlpt_readiness_user_date_idx
  on public.jlpt_readiness_snapshots(user_id, snapshot_date desc);
create index if not exists jlpt_readiness_goal_date_idx
  on public.jlpt_readiness_snapshots(user_goal_id, snapshot_date desc);
create index if not exists jlpt_readiness_pace_idx
  on public.jlpt_readiness_snapshots(user_id, pace_status, snapshot_date desc);

grant select, insert, update, delete on public.goal_events to authenticated;
grant select, insert, update, delete on public.jlpt_readiness_snapshots to authenticated;

alter table public.goal_events enable row level security;
alter table public.jlpt_readiness_snapshots enable row level security;

drop policy if exists "own goal events" on public.goal_events;
create policy "own goal events" on public.goal_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own jlpt readiness snapshots" on public.jlpt_readiness_snapshots;
create policy "own jlpt readiness snapshots" on public.jlpt_readiness_snapshots
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
