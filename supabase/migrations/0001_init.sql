-- 日文快上手 — initial schema

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- profiles
------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  show_romaji boolean not null default true,
  preferred_voice text default 'Takumi',
  default_jlpt_level text default 'N5',
  daily_word_count integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------
-- decks
------------------------------------------------------------
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('manual', 'ocr', 'ai_generated')),
  topic text,
  deck_date date not null default current_date,
  raw_input text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.decks(user_id, deck_date desc);

------------------------------------------------------------
-- vocabulary_items
------------------------------------------------------------
create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  japanese text not null,
  kanji text,
  kana text,
  romaji text,
  meaning_zh text,
  meaning_en text,
  part_of_speech text,
  jlpt_level text,
  priority_tier smallint check (priority_tier between 1 and 3),
  pitch_accent text,
  register_label text,
  core_explanation text,
  source_type text check (source_type in ('manual', 'ocr', 'ai_generated')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vocabulary_items(deck_id);
create index on public.vocabulary_items(user_id, created_at desc);

------------------------------------------------------------
-- verb_forms / adjective_forms
------------------------------------------------------------
create table public.verb_forms (
  id uuid primary key default gen_random_uuid(),
  vocab_id uuid not null references public.vocabulary_items(id) on delete cascade,
  dictionary_form text,
  masu_form text,
  te_form text,
  ta_form text,
  nai_form text,
  potential_form text,
  passive_form text,
  causative_form text,
  causative_passive_form text,
  conditional_form text,
  volitional_form text,
  imperative_form text,
  transitivity text,
  particle_pattern text,
  created_at timestamptz not null default now()
);
create index on public.verb_forms(vocab_id);

create table public.adjective_forms (
  id uuid primary key default gen_random_uuid(),
  vocab_id uuid not null references public.vocabulary_items(id) on delete cascade,
  adjective_type text,
  negative_form text,
  past_form text,
  past_negative_form text,
  adverbial_form text,
  noun_modifying_example text,
  created_at timestamptz not null default now()
);
create index on public.adjective_forms(vocab_id);

------------------------------------------------------------
-- example_sentences
------------------------------------------------------------
create table public.example_sentences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocab_id uuid references public.vocabulary_items(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete cascade,
  japanese_sentence text not null,
  kana_sentence text,
  romaji_sentence text,
  meaning_zh text,
  meaning_en text,
  sentence_type text check (sentence_type in ('example', 'personal', 'conversation', 'story')),
  created_at timestamptz not null default now()
);
create index on public.example_sentences(vocab_id);

------------------------------------------------------------
-- vocabulary_relationships
------------------------------------------------------------
create table public.vocabulary_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_vocab_id uuid not null references public.vocabulary_items(id) on delete cascade,
  target_vocab_id uuid not null references public.vocabulary_items(id) on delete cascade,
  relationship_type text not null,
  explanation text,
  example_sentence text,
  created_at timestamptz not null default now()
);
create index on public.vocabulary_relationships(source_vocab_id);
create index on public.vocabulary_relationships(target_vocab_id);

------------------------------------------------------------
-- reviews
------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocab_id uuid not null references public.vocabulary_items(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete cascade,
  review_date date,
  next_review_date date,
  review_count integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  confidence_level smallint,
  ease_score real,
  status text default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vocab_id)
);
create index on public.reviews(user_id, next_review_date);

------------------------------------------------------------
-- quiz_attempts
------------------------------------------------------------
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete cascade,
  vocab_id uuid references public.vocabulary_items(id) on delete cascade,
  quiz_type text not null,
  prompt text,
  user_answer text,
  correct_answer text,
  is_correct boolean,
  explanation text,
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts(user_id, created_at desc);

------------------------------------------------------------
-- tts_audio_cache
------------------------------------------------------------
create table public.tts_audio_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  normalized_text text not null,
  text_hash text not null,
  provider text not null default 'polly',
  voice_id text not null,
  language_code text not null default 'ja-JP',
  storage_path text not null,
  audio_url text,
  access_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  unique (text_hash, voice_id, language_code, provider)
);

------------------------------------------------------------
-- generated_images
------------------------------------------------------------
create table public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete cascade,
  vocab_id uuid references public.vocabulary_items(id) on delete cascade,
  image_type text check (image_type in ('deck_scene', 'mnemonic')),
  prompt text,
  model text,
  storage_path text,
  image_url text,
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- ocr_imports
------------------------------------------------------------
create table public.ocr_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  image_storage_path text,
  raw_gemini_response jsonb,
  extracted_json jsonb,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.verb_forms enable row level security;
alter table public.adjective_forms enable row level security;
alter table public.example_sentences enable row level security;
alter table public.vocabulary_relationships enable row level security;
alter table public.reviews enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.tts_audio_cache enable row level security;
alter table public.generated_images enable row level security;
alter table public.ocr_imports enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own decks" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own vocab" on public.vocabulary_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vocab-scoped verbs" on public.verb_forms
  for all using (
    exists (select 1 from public.vocabulary_items v where v.id = vocab_id and v.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.vocabulary_items v where v.id = vocab_id and v.user_id = auth.uid())
  );

create policy "vocab-scoped adj" on public.adjective_forms
  for all using (
    exists (select 1 from public.vocabulary_items v where v.id = vocab_id and v.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.vocabulary_items v where v.id = vocab_id and v.user_id = auth.uid())
  );

create policy "own sentences" on public.example_sentences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own relationships" on public.vocabulary_relationships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own reviews" on public.reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own quiz" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own tts" on public.tts_audio_cache
  for all using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

create policy "own images" on public.generated_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own ocr" on public.ocr_imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------
-- Auto-create profile on signup
------------------------------------------------------------
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
