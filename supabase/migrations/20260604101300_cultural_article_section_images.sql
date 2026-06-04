alter table public.cultural_contents
  add column if not exists cantonese_lens_image_url text,
  add column if not exists cantonese_lens_image_prompt text;

alter table public.generated_images
  drop constraint if exists generated_images_image_type_check;

alter table public.generated_images
  add constraint generated_images_image_type_check
  check (
    image_type in (
      'deck_scene',
      'mnemonic',
      'cultural_article_thumbnail',
      'cultural_article_section'
    )
  );
