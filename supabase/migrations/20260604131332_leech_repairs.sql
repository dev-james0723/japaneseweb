-- Durable repair evidence for weak/leech cards. The repair lane can now measure
-- whether a user only saw a rescue prompt or actually completed a repair touch.

create table if not exists public.leech_repairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null default current_date,
  target_type text not null check (target_type in ('vocab', 'sentence', 'weakness')),
  vocab_id uuid references public.vocabulary_items(id) on delete set null,
  sentence_review_prompt_id uuid references public.sentence_review_prompts(id) on delete set null,
  weakness_event_id uuid references public.weakness_events(id) on delete set null,
  activity_type text not null check (activity_type in (
    'review_rescue',
    'shadow_loop',
    'memory_game',
    'grammar_contrast',
    'output_proof',
    'manual'
  )),
  repair_stage text not null default 'diagnose' check (repair_stage in (
    'diagnose',
    'contrast',
    'shadow',
    'output_proof',
    'completed'
  )),
  rating text check (rating is null or rating in ('again', 'hard', 'good', 'easy')),
  success boolean not null default false,
  evidence_text text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'vocab' and vocab_id is not null)
    or (target_type = 'sentence' and sentence_review_prompt_id is not null)
    or (target_type = 'weakness' and weakness_event_id is not null)
  )
);

create index if not exists leech_repairs_user_created_idx
  on public.leech_repairs(user_id, created_at desc);
create index if not exists leech_repairs_user_target_idx
  on public.leech_repairs(user_id, target_type, created_at desc);
create index if not exists leech_repairs_user_success_idx
  on public.leech_repairs(user_id, success, created_at desc);
create index if not exists leech_repairs_vocab_idx
  on public.leech_repairs(vocab_id)
  where vocab_id is not null;
create index if not exists leech_repairs_sentence_idx
  on public.leech_repairs(sentence_review_prompt_id)
  where sentence_review_prompt_id is not null;

drop trigger if exists leech_repairs_updated_at on public.leech_repairs;
create trigger leech_repairs_updated_at
  before update on public.leech_repairs
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.leech_repairs to authenticated;

alter table public.leech_repairs enable row level security;

drop policy if exists "own leech repairs" on public.leech_repairs;
create policy "own leech repairs" on public.leech_repairs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
