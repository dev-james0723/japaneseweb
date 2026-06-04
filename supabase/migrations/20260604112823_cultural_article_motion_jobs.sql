create table if not exists public.cultural_article_motion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.cultural_contents(id) on delete cascade,
  engine text not null default 'remotion' check (engine in ('remotion', 'hyperframes')),
  status text not null default 'queued' check (status in ('queued', 'rendering', 'completed', 'failed')),
  motion_manifest jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  error_message text,
  render_requested_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cultural_article_motion_jobs_article_engine_idx
  on public.cultural_article_motion_jobs(user_id, article_id, engine);

create index if not exists cultural_article_motion_jobs_user_status_idx
  on public.cultural_article_motion_jobs(user_id, status, created_at desc);

create index if not exists cultural_article_motion_jobs_article_idx
  on public.cultural_article_motion_jobs(article_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cultural_article_motion_jobs_updated_at on public.cultural_article_motion_jobs;
create trigger cultural_article_motion_jobs_updated_at
  before update on public.cultural_article_motion_jobs
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.cultural_article_motion_jobs to authenticated;

alter table public.cultural_article_motion_jobs enable row level security;

drop policy if exists "own cultural article motion jobs select" on public.cultural_article_motion_jobs;
create policy "own cultural article motion jobs select" on public.cultural_article_motion_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own cultural article motion jobs insert" on public.cultural_article_motion_jobs;
create policy "own cultural article motion jobs insert" on public.cultural_article_motion_jobs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own cultural article motion jobs update" on public.cultural_article_motion_jobs;
create policy "own cultural article motion jobs update" on public.cultural_article_motion_jobs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own cultural article motion jobs delete" on public.cultural_article_motion_jobs;
create policy "own cultural article motion jobs delete" on public.cultural_article_motion_jobs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
