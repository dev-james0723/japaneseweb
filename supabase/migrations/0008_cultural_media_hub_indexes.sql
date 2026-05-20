-- Phase 7.1 follow-up: daily pick uniqueness, search_path hardening, Data API grants

create unique index if not exists idx_cultural_daily_pick_unique
  on public.cultural_contents (user_id, daily_pick_date)
  where is_daily_pick = true and daily_pick_date is not null and user_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant select, insert, update, delete on public.cultural_contents to authenticated;
grant select, insert, update, delete on public.cultural_interactions to authenticated;
grant select, insert, update, delete on public.cultural_preferences to authenticated;
grant select on public.curated_channels to authenticated;
grant select on public.curated_podcasts to authenticated;
