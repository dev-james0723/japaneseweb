-- First-class daily output prompts. Daily lessons already carry a compact
-- output_mission string; this table makes the mission queryable, schedulable,
-- and completable as evidence for the Output Engine.

create table if not exists public.daily_output_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_date date not null default current_date,
  daily_lesson_id uuid references public.daily_lessons(id) on delete cascade,
  cultural_content_id uuid references public.cultural_contents(id) on delete set null,
  content_item_id uuid references public.content_items(id) on delete set null,
  prompt_type text not null default 'journal' check (
    prompt_type in ('journal', 'self_talk', 'roleplay', 'speaking', 'reflection')
  ),
  prompt_text text not null,
  prompt_language text not null default 'zh-Hant' check (prompt_language in ('ja', 'zh-Hant', 'mixed')),
  input_hook text,
  target_jlpt text check (target_jlpt is null or target_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1')),
  grammar_focus text[] not null default '{}',
  vocab_focus text[] not null default '{}',
  can_do_id text,
  status text not null default 'new' check (status in ('new', 'started', 'completed', 'skipped', 'archived')),
  response_text_ja text,
  corrected_text_ja text,
  proof_reference text,
  completed_at timestamptz,
  source_surface text not null default 'daily_lesson' check (
    length(source_surface) >= 1 and length(source_surface) <= 80
  ),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    daily_lesson_id is not null
    or cultural_content_id is not null
    or content_item_id is not null
    or nullif(proof_reference, '') is not null
  )
);

create unique index if not exists daily_output_prompts_daily_lesson_type_idx
  on public.daily_output_prompts(daily_lesson_id, prompt_type);
create index if not exists daily_output_prompts_user_date_status_idx
  on public.daily_output_prompts(user_id, prompt_date desc, status);
create index if not exists daily_output_prompts_user_created_idx
  on public.daily_output_prompts(user_id, created_at desc);
create index if not exists daily_output_prompts_cultural_content_idx
  on public.daily_output_prompts(cultural_content_id, created_at desc)
  where cultural_content_id is not null;
create index if not exists daily_output_prompts_content_item_idx
  on public.daily_output_prompts(content_item_id, created_at desc)
  where content_item_id is not null;
create index if not exists daily_output_prompts_metadata_idx
  on public.daily_output_prompts using gin (metadata);

grant select, insert, update, delete on public.daily_output_prompts to authenticated;

drop trigger if exists daily_output_prompts_updated_at on public.daily_output_prompts;
create trigger daily_output_prompts_updated_at
  before update on public.daily_output_prompts
  for each row execute function public.set_updated_at();

alter table public.daily_output_prompts enable row level security;

drop policy if exists "select own daily output prompts" on public.daily_output_prompts;
create policy "select own daily output prompts" on public.daily_output_prompts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own daily output prompts" on public.daily_output_prompts;
create policy "insert own daily output prompts" on public.daily_output_prompts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own daily output prompts" on public.daily_output_prompts;
create policy "update own daily output prompts" on public.daily_output_prompts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own daily output prompts" on public.daily_output_prompts;
create policy "delete own daily output prompts" on public.daily_output_prompts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
