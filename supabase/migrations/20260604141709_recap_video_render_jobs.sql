-- Learner recap motion jobs. These records turn daily and weekly learning
-- evidence into renderable Remotion/HyperFrames handoffs.

create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null check (job_type in (
    'cultural_article',
    'daily_recap',
    'weekly_recap',
    'grammar_explainer',
    'memory_palace'
  )),
  engine text not null default 'remotion' check (engine in ('remotion', 'hyperframes')),
  status text not null default 'queued' check (status in (
    'queued',
    'rendering',
    'completed',
    'failed',
    'cancelled'
  )),
  source_table text,
  source_id uuid,
  idempotency_key text not null,
  input_payload jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  error_message text,
  render_requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists render_jobs_user_status_created_idx
  on public.render_jobs(user_id, status, created_at desc);
create index if not exists render_jobs_user_type_created_idx
  on public.render_jobs(user_id, job_type, created_at desc);
create index if not exists render_jobs_source_idx
  on public.render_jobs(source_table, source_id)
  where source_table is not null and source_id is not null;

create table if not exists public.daily_recap_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recap_date date not null,
  render_job_id uuid references public.render_jobs(id) on delete set null,
  status text not null default 'queued' check (status in (
    'queued',
    'rendering',
    'completed',
    'failed',
    'cancelled'
  )),
  title text not null,
  recap_payload jsonb not null default '{}'::jsonb,
  motion_manifest jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  error_message text,
  render_requested_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recap_date)
);

create index if not exists daily_recap_videos_user_date_idx
  on public.daily_recap_videos(user_id, recap_date desc);
create index if not exists daily_recap_videos_user_status_idx
  on public.daily_recap_videos(user_id, status, updated_at desc);
create index if not exists daily_recap_videos_render_job_idx
  on public.daily_recap_videos(render_job_id)
  where render_job_id is not null;

create table if not exists public.weekly_recap_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  render_job_id uuid references public.render_jobs(id) on delete set null,
  status text not null default 'queued' check (status in (
    'queued',
    'rendering',
    'completed',
    'failed',
    'cancelled'
  )),
  title text not null,
  recap_payload jsonb not null default '{}'::jsonb,
  motion_manifest jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  error_message text,
  render_requested_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create index if not exists weekly_recap_videos_user_week_idx
  on public.weekly_recap_videos(user_id, week_start_date desc);
create index if not exists weekly_recap_videos_user_status_idx
  on public.weekly_recap_videos(user_id, status, updated_at desc);
create index if not exists weekly_recap_videos_render_job_idx
  on public.weekly_recap_videos(render_job_id)
  where render_job_id is not null;

drop trigger if exists render_jobs_updated_at on public.render_jobs;
create trigger render_jobs_updated_at
  before update on public.render_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists daily_recap_videos_updated_at on public.daily_recap_videos;
create trigger daily_recap_videos_updated_at
  before update on public.daily_recap_videos
  for each row execute function public.set_updated_at();

drop trigger if exists weekly_recap_videos_updated_at on public.weekly_recap_videos;
create trigger weekly_recap_videos_updated_at
  before update on public.weekly_recap_videos
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.render_jobs to authenticated;
grant select, insert, update, delete on public.daily_recap_videos to authenticated;
grant select, insert, update, delete on public.weekly_recap_videos to authenticated;

alter table public.render_jobs enable row level security;
alter table public.daily_recap_videos enable row level security;
alter table public.weekly_recap_videos enable row level security;

drop policy if exists "own render jobs select" on public.render_jobs;
create policy "own render jobs select" on public.render_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own render jobs insert" on public.render_jobs;
create policy "own render jobs insert" on public.render_jobs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own render jobs update" on public.render_jobs;
create policy "own render jobs update" on public.render_jobs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own render jobs delete" on public.render_jobs;
create policy "own render jobs delete" on public.render_jobs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own daily recap videos select" on public.daily_recap_videos;
create policy "own daily recap videos select" on public.daily_recap_videos
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own daily recap videos insert" on public.daily_recap_videos;
create policy "own daily recap videos insert" on public.daily_recap_videos
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own daily recap videos update" on public.daily_recap_videos;
create policy "own daily recap videos update" on public.daily_recap_videos
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own daily recap videos delete" on public.daily_recap_videos;
create policy "own daily recap videos delete" on public.daily_recap_videos
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own weekly recap videos select" on public.weekly_recap_videos;
create policy "own weekly recap videos select" on public.weekly_recap_videos
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own weekly recap videos insert" on public.weekly_recap_videos;
create policy "own weekly recap videos insert" on public.weekly_recap_videos
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own weekly recap videos update" on public.weekly_recap_videos;
create policy "own weekly recap videos update" on public.weekly_recap_videos
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own weekly recap videos delete" on public.weekly_recap_videos;
create policy "own weekly recap videos delete" on public.weekly_recap_videos
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
