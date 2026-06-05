-- User-visible AI quality reports. These are guardrail signals for generated
-- Japanese, translations, explanations, source claims, and safety issues.

create table if not exists public.ai_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null default current_date,
  source_surface text not null check (
    length(source_surface) >= 1 and length(source_surface) <= 80
  ),
  target_type text not null default 'ai_output' check (
    target_type in (
      'ai_output',
      'cultural_article',
      'daily_lesson',
      'professor_reply',
      'roleplay_reply',
      'journal_correction',
      'sentence_mining',
      'other'
    )
  ),
  target_id text,
  report_type text not null check (
    report_type in (
      'wrong_japanese',
      'wrong_translation',
      'wrong_explanation',
      'bad_source_claim',
      'unsafe_or_sensitive',
      'copyright_or_policy',
      'other'
    )
  ),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  ai_output_excerpt text check (ai_output_excerpt is null or length(ai_output_excerpt) <= 1200),
  user_note text check (user_note is null or length(user_note) <= 1200),
  context_url text,
  metadata jsonb not null default '{}',
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_feedback_reports_user_created_idx
  on public.ai_feedback_reports(user_id, created_at desc);
create index if not exists ai_feedback_reports_user_status_idx
  on public.ai_feedback_reports(user_id, status, created_at desc);
create index if not exists ai_feedback_reports_surface_idx
  on public.ai_feedback_reports(source_surface, created_at desc);
create index if not exists ai_feedback_reports_metadata_idx
  on public.ai_feedback_reports using gin (metadata);

grant select, insert, update, delete on public.ai_feedback_reports to authenticated;

drop trigger if exists ai_feedback_reports_updated_at on public.ai_feedback_reports;
create trigger ai_feedback_reports_updated_at
  before update on public.ai_feedback_reports
  for each row execute function public.set_updated_at();

alter table public.ai_feedback_reports enable row level security;

drop policy if exists "select own ai feedback reports" on public.ai_feedback_reports;
create policy "select own ai feedback reports" on public.ai_feedback_reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own ai feedback reports" on public.ai_feedback_reports;
create policy "insert own ai feedback reports" on public.ai_feedback_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own ai feedback reports" on public.ai_feedback_reports;
create policy "update own ai feedback reports" on public.ai_feedback_reports
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own ai feedback reports" on public.ai_feedback_reports;
create policy "delete own ai feedback reports" on public.ai_feedback_reports
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
