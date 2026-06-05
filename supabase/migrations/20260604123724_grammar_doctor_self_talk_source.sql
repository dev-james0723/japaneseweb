-- Allow self-talk corrections to become first-class weakness events. This keeps
-- the output feedback loop consistent across journal, roleplay, and internal
-- Japanese habit logs.

alter table public.weakness_events
  drop constraint if exists weakness_events_source_check;

alter table public.weakness_events
  add constraint weakness_events_source_check
  check (source in (
    'review',
    'sentence_review',
    'weekly_review',
    'roleplay',
    'journal',
    'self_talk',
    'grammar'
  ));
