-- Track one-shot automatic AI enrichment (analyze + deck scene + memory storylines)
-- after a deck is created. Existing decks are marked completed so they are not reprocessed.

alter table public.decks
  add column if not exists ai_auto_fill_completed boolean not null default false;

alter table public.decks
  add column if not exists ai_auto_fill_attempts smallint not null default 0;

alter table public.decks
  add column if not exists ai_auto_fill_last_error text;

update public.decks
set ai_auto_fill_completed = true,
    ai_auto_fill_attempts = 0,
    ai_auto_fill_last_error = null
where ai_auto_fill_completed = false;
