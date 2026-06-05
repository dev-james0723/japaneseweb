-- Smart notification planner. These tables store user preferences, planned
-- reminder events, and outcome signals so notifications can adapt to actual
-- study behavior instead of pushing at fixed times.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  browser_notifications_enabled boolean not null default false,
  adaptive_timing_enabled boolean not null default true,
  time_zone text not null default 'Asia/Hong_Kong',
  morning_time time not null default '08:30',
  quiet_start time not null default '23:00',
  quiet_end time not null default '07:30',
  max_per_day int not null default 3 check (max_per_day between 1 and 8),
  review_due_enabled boolean not null default true,
  curiosity_enabled boolean not null default true,
  goal_pressure_enabled boolean not null default true,
  streak_rescue_enabled boolean not null default true,
  weekly_review_enabled boolean not null default true,
  exam_mode_enabled boolean not null default true,
  daily_plan_enabled boolean not null default true,
  output_nudge_enabled boolean not null default true,
  last_planned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'due_review',
    'curiosity',
    'goal',
    'streak',
    'weekly',
    'exam_mode',
    'daily_plan',
    'output_nudge'
  )),
  event_date date not null default current_date,
  scheduled_at timestamptz not null,
  user_local_time time not null,
  deep_link text not null,
  title text not null,
  body text not null,
  reason text not null,
  status text not null default 'planned' check (status in (
    'planned',
    'sent',
    'opened',
    'completed',
    'dismissed',
    'cancelled',
    'expired'
  )),
  opened boolean not null default false,
  completed_after_open boolean not null default false,
  sent_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.notification_events(id) on delete set null,
  outcome_type text not null check (outcome_type in (
    'opened',
    'completed_after_open',
    'dismissed',
    'snoozed',
    'permission_granted',
    'permission_denied',
    'test_sent'
  )),
  deep_link text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists notification_events_user_scheduled_idx
  on public.notification_events(user_id, scheduled_at desc);

create index if not exists notification_events_user_status_idx
  on public.notification_events(user_id, status, scheduled_at desc);

create unique index if not exists notification_events_user_day_type_link_idx
  on public.notification_events(user_id, event_date, type, deep_link);

create index if not exists notification_outcomes_user_occurred_idx
  on public.notification_outcomes(user_id, occurred_at desc);

create index if not exists notification_outcomes_event_idx
  on public.notification_outcomes(event_id);

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

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists notification_events_updated_at on public.notification_events;
create trigger notification_events_updated_at
  before update on public.notification_events
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notification_events to authenticated;
grant select, insert, update, delete on public.notification_outcomes to authenticated;

alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_outcomes enable row level security;

drop policy if exists "own notification preferences" on public.notification_preferences;
create policy "own notification preferences" on public.notification_preferences
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own notification events" on public.notification_events;
create policy "own notification events" on public.notification_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own notification outcomes" on public.notification_outcomes;
create policy "own notification outcomes" on public.notification_outcomes
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Keep signup provisioning in sync with the latest OS tables.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_os_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.cultural_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
