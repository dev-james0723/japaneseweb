-- Persist the AI persona used for each conversation so roleplay evidence can be
-- analyzed by practice mode without creating another exposed table.

alter table public.roleplay_sessions
  add column if not exists persona_id text not null default 'mission-default';

alter table public.roleplay_sessions
  drop constraint if exists roleplay_sessions_persona_id_check;

alter table public.roleplay_sessions
  add constraint roleplay_sessions_persona_id_check
  check (persona_id in (
    'mission-default',
    'tokyo-friend',
    'sensei',
    'konbini',
    'senpai',
    'examiner'
  ));

create index if not exists roleplay_sessions_user_persona_started_idx
  on public.roleplay_sessions(user_id, persona_id, started_at desc);
