-- Notebook: folders + entries (separate from decks / SRS)

------------------------------------------------------------
-- notebook_folders
------------------------------------------------------------
create table public.notebook_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.notebook_folders(id) on delete set null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notebook_folders_user_sort_idx on public.notebook_folders(user_id, sort_order);
create index notebook_folders_parent_idx on public.notebook_folders(user_id, parent_id);

------------------------------------------------------------
-- notebook_entries
------------------------------------------------------------
create table public.notebook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.notebook_folders(id) on delete set null,
  kind text not null default 'term' check (kind in ('term', 'phrase', 'freeform')),
  japanese text,
  reading text,
  meaning_zh text,
  meaning_en text,
  content text,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  source_vocab_id uuid references public.vocabulary_items(id) on delete set null,
  ai_suggested_folder_id uuid references public.notebook_folders(id) on delete set null,
  ai_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notebook_entries_has_content check (
    coalesce(nullif(trim(japanese), ''), nullif(trim(content), '')) is not null
  )
);
create index notebook_entries_user_folder_idx
  on public.notebook_entries(user_id, folder_id, updated_at desc);
create index notebook_entries_user_favorite_idx
  on public.notebook_entries(user_id, is_favorite)
  where is_favorite = true;
create index notebook_entries_source_vocab_idx
  on public.notebook_entries(user_id, source_vocab_id)
  where source_vocab_id is not null;

------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notebook_folders_updated_at
  before update on public.notebook_folders
  for each row execute function public.set_updated_at();

create trigger notebook_entries_updated_at
  before update on public.notebook_entries
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------
alter table public.notebook_folders enable row level security;
alter table public.notebook_entries enable row level security;

create policy "own notebook folders" on public.notebook_folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own notebook entries" on public.notebook_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
