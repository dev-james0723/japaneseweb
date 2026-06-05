-- Durable evidence that a user actually used a Daily Feed/content item.
-- This intentionally stores metadata, links, and counts rather than full
-- copyrighted source text.

create table if not exists public.content_user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null default current_date,
  content_item_id uuid references public.content_items(id) on delete set null,
  daily_lesson_id uuid references public.daily_lessons(id) on delete set null,
  cultural_content_id uuid references public.cultural_contents(id) on delete set null,
  interaction_type text not null check (
    interaction_type in (
      'view',
      'open_source',
      'read',
      'lesson_start',
      'lesson_complete',
      'save',
      'mine',
      'add_vocab',
      'shadow',
      'output',
      'discuss',
      'quiz',
      'dismiss'
    )
  ),
  source_surface text not null default 'unknown' check (
    length(source_surface) >= 1 and length(source_surface) <= 80
  ),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  items_created integer not null default 0 check (items_created >= 0),
  deep_link text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    content_item_id is not null
    or daily_lesson_id is not null
    or cultural_content_id is not null
    or nullif(deep_link, '') is not null
  )
);

create index if not exists content_user_interactions_user_created_idx
  on public.content_user_interactions(user_id, created_at desc);
create index if not exists content_user_interactions_user_date_type_idx
  on public.content_user_interactions(user_id, event_date desc, interaction_type);
create index if not exists content_user_interactions_content_item_idx
  on public.content_user_interactions(content_item_id, created_at desc)
  where content_item_id is not null;
create index if not exists content_user_interactions_daily_lesson_idx
  on public.content_user_interactions(daily_lesson_id, created_at desc)
  where daily_lesson_id is not null;
create index if not exists content_user_interactions_cultural_content_idx
  on public.content_user_interactions(cultural_content_id, created_at desc)
  where cultural_content_id is not null;
create index if not exists content_user_interactions_metadata_idx
  on public.content_user_interactions using gin (metadata);

grant select, insert, update, delete on public.content_user_interactions to authenticated;

drop trigger if exists content_user_interactions_updated_at on public.content_user_interactions;
create trigger content_user_interactions_updated_at
  before update on public.content_user_interactions
  for each row execute function public.set_updated_at();

alter table public.content_user_interactions enable row level security;

drop policy if exists "select own content interactions" on public.content_user_interactions;
create policy "select own content interactions" on public.content_user_interactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own content interactions" on public.content_user_interactions;
create policy "insert own content interactions" on public.content_user_interactions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own content interactions" on public.content_user_interactions;
create policy "update own content interactions" on public.content_user_interactions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own content interactions" on public.content_user_interactions;
create policy "delete own content interactions" on public.content_user_interactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
