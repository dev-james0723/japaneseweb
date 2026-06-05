-- First-class learning contract models for goals, weekly plans, and evidence
-- backed skill scores. These tables sit beside user_os_settings so settings can
-- stay lightweight while the OS has auditable goal history.

create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null default 'JLPT' check (goal_type in (
    'JLPT',
    'communication',
    'travel',
    'work',
    'culture',
    'reading',
    'speaking'
  )),
  target_level text check (target_level is null or target_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  deadline date,
  daily_minutes int not null default 45 check (daily_minutes between 5 and 180),
  weekly_days int not null default 5 check (weekly_days between 1 and 7),
  priority_skill text not null default 'balanced' check (priority_skill in (
    'balanced',
    'vocab',
    'grammar',
    'reading',
    'listening',
    'speaking',
    'writing',
    'kanji'
  )),
  intensity text not null default 'balanced' check (intensity in ('chill', 'balanced', 'exam', 'hardcore')),
  topics text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_goals_one_active_idx
  on public.user_goals(user_id)
  where active;
create index if not exists user_goals_user_created_idx
  on public.user_goals(user_id, created_at desc);

create table if not exists public.learning_plan_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_goal_id uuid references public.user_goals(id) on delete cascade,
  week_start_date date not null,
  week_number int not null default 1 check (week_number > 0),
  target_vocab int not null default 20 check (target_vocab >= 0),
  target_grammar int not null default 2 check (target_grammar >= 0),
  target_sentences int not null default 12 check (target_sentences >= 0),
  target_output_tasks int not null default 5 check (target_output_tasks >= 0),
  focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_goal_id, week_start_date)
);

create index if not exists learning_plan_weeks_user_week_idx
  on public.learning_plan_weeks(user_id, week_start_date desc);

create table if not exists public.skill_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dimension text not null check (dimension in (
    'vocabulary_recognition',
    'vocabulary_production',
    'kanji_recognition',
    'grammar_understanding',
    'grammar_production',
    'reading_comprehension',
    'listening_comprehension',
    'speaking_shadowing',
    'writing_accuracy',
    'sentence_mining_retention',
    'output_consistency',
    'cultural_literacy'
  )),
  score int not null check (score between 0 and 100),
  evidence text,
  source text not null default 'computed' check (source in ('computed', 'self_assessment', 'coach_adjusted')),
  measured_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, dimension, measured_at, source)
);

create index if not exists skill_scores_user_dimension_idx
  on public.skill_scores(user_id, dimension, measured_at desc);

create table if not exists public.radar_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  scores jsonb not null default '{}',
  evidence jsonb not null default '{}',
  source text not null default 'computed' check (source in ('computed', 'weekly_review', 'monthly_audit')),
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date, source)
);

create index if not exists radar_snapshots_user_date_idx
  on public.radar_snapshots(user_id, snapshot_date desc);

drop trigger if exists user_goals_updated_at on public.user_goals;
create trigger user_goals_updated_at
  before update on public.user_goals
  for each row execute function public.set_updated_at();

drop trigger if exists learning_plan_weeks_updated_at on public.learning_plan_weeks;
create trigger learning_plan_weeks_updated_at
  before update on public.learning_plan_weeks
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.user_goals to authenticated;
grant select, insert, update, delete on public.learning_plan_weeks to authenticated;
grant select, insert, update, delete on public.skill_scores to authenticated;
grant select, insert, update, delete on public.radar_snapshots to authenticated;

alter table public.user_goals enable row level security;
alter table public.learning_plan_weeks enable row level security;
alter table public.skill_scores enable row level security;
alter table public.radar_snapshots enable row level security;

drop policy if exists "own user goals" on public.user_goals;
create policy "own user goals" on public.user_goals
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own learning plan weeks" on public.learning_plan_weeks;
create policy "own learning plan weeks" on public.learning_plan_weeks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own skill scores" on public.skill_scores;
create policy "own skill scores" on public.skill_scores
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own radar snapshots" on public.radar_snapshots;
create policy "own radar snapshots" on public.radar_snapshots
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into public.user_goals (
  user_id,
  goal_type,
  target_level,
  deadline,
  daily_minutes,
  weekly_days,
  priority_skill,
  intensity,
  active
)
select
  settings.user_id,
  'JLPT',
  case
    when settings.target_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1') then settings.target_jlpt
    else 'N2'
  end,
  settings.target_date,
  case settings.daily_mode
    when 'min' then 15
    when 'deep' then 90
    else 45
  end,
  5,
  'balanced',
  case settings.daily_mode
    when 'min' then 'chill'
    when 'deep' then 'exam'
    else 'balanced'
  end,
  true
from public.user_os_settings settings
where not exists (
  select 1
  from public.user_goals goals
  where goals.user_id = settings.user_id
    and goals.active
);

insert into public.learning_plan_weeks (
  user_id,
  user_goal_id,
  week_start_date,
  week_number,
  target_vocab,
  target_grammar,
  target_sentences,
  target_output_tasks,
  focus
)
select
  goals.user_id,
  goals.id,
  date_trunc('week', current_date)::date,
  1,
  coalesce(settings.weekly_new_vocab_quota, 20),
  coalesce(settings.weekly_new_grammar_quota, 2),
  greatest(8, coalesce(settings.weekly_new_vocab_quota, 20) / 2),
  goals.weekly_days,
  concat(goals.target_level, ' ', goals.priority_skill, ' plan')
from public.user_goals goals
left join public.user_os_settings settings on settings.user_id = goals.user_id
where goals.active
on conflict (user_goal_id, week_start_date) do nothing;

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

  insert into public.user_goals (
    user_id,
    goal_type,
    target_level,
    daily_minutes,
    weekly_days,
    priority_skill,
    intensity,
    active
  )
  select
    new.id,
    'JLPT',
    'N2',
    45,
    5,
    'balanced',
    'balanced',
    true
  where not exists (
    select 1 from public.user_goals goals
    where goals.user_id = new.id
      and goals.active
  );

  return new;
end;
$$;
