alter table public.profiles
add column if not exists os_buddy_pet_id text default 'xiaoba',
add column if not exists os_buddy_name text default 'Koto',
add column if not exists os_buddy_enabled boolean default true,
add column if not exists os_buddy_position jsonb default '{"x": null, "y": null, "anchor": "bottom-right"}'::jsonb,
add column if not exists os_buddy_onboarding_completed boolean default false,
add column if not exists os_buddy_interaction_stats jsonb default '{}'::jsonb,
add column if not exists os_buddy_unlocked_pets jsonb default '["xiaoba", "doge"]'::jsonb,
add column if not exists os_buddy_birthday_enabled boolean default false,
add column if not exists os_buddy_birthday_month int,
add column if not exists os_buddy_birthday_day int,
add column if not exists os_buddy_birthday_year int,
add column if not exists os_buddy_birthday_show_age boolean default false,
add column if not exists os_buddy_birthday_reminder_enabled boolean default true,
add column if not exists os_buddy_birthday_timezone text,
add column if not exists os_buddy_birthday_last_celebrated_on text,
add column if not exists os_buddy_birthday_last_reminder_on text,
add column if not exists os_buddy_free_roam_enabled boolean default false,
add column if not exists os_buddy_free_roam_intensity text default 'balanced'
  check (os_buddy_free_roam_intensity in ('subtle', 'balanced', 'lively')),
add column if not exists os_buddy_free_roam_return_home boolean default true,
add column if not exists os_buddy_free_roam_near_home_only boolean default true,
add column if not exists os_buddy_shortcut_settings jsonb default '{
  "desktopToggle": {
    "key": " ",
    "code": "Space",
    "label": "Space",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    },
    "pressCount": 2
  },
  "twoFingerDoubleTapEnabled": true
}'::jsonb;

update public.profiles
set os_buddy_shortcut_settings = '{
  "desktopToggle": {
    "key": " ",
    "code": "Space",
    "label": "Space",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    },
    "pressCount": 2
  },
  "twoFingerDoubleTapEnabled": true
}'::jsonb
where os_buddy_shortcut_settings is null;
