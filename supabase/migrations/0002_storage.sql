-- Storage buckets for TTS audio, generated images, OCR uploads.

insert into storage.buckets (id, name, public)
values ('tts-audio', 'tts-audio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ocr-uploads', 'ocr-uploads', false)
on conflict (id) do nothing;

-- Public read for tts-audio and generated-images (objects are anon-readable;
-- writes still gated by service-role from our API routes).
drop policy if exists "public read tts" on storage.objects;
create policy "public read tts" on storage.objects
  for select using (bucket_id = 'tts-audio');

drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects
  for select using (bucket_id = 'generated-images');

-- OCR uploads are private to owner.
drop policy if exists "own ocr read" on storage.objects;
create policy "own ocr read" on storage.objects
  for select using (
    bucket_id = 'ocr-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own ocr write" on storage.objects;
create policy "own ocr write" on storage.objects
  for insert with check (
    bucket_id = 'ocr-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own ocr delete" on storage.objects;
create policy "own ocr delete" on storage.objects
  for delete using (
    bucket_id = 'ocr-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
