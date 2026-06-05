alter table public.cultural_contents
  add column if not exists article_visuals jsonb not null default '[]'::jsonb;
