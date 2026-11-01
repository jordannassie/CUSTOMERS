-- Migration 052: a business's neighborhood or area, for area-level questions ("best coffee shop in East Austin").
-- Additive only (D-43): a new nullable column and a length check.
--
-- businesses.primary_area: optional, typed or confirmed by the owner on the details step or in Settings. Google
-- Places may pre-fill the form from the listing's neighborhood, but only what the user confirms is saved here
-- (MVP_SPEC 26). When set, some suggested questions are asked about this area instead of the whole city.

alter table public.businesses add column if not exists primary_area text;

-- NOT VALID: no existing row has a value, and it skips a full-table scan; new and updated rows are checked.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass and conname = 'businesses_primary_area_length'
  ) then
    alter table public.businesses
      add constraint businesses_primary_area_length check (char_length(primary_area) <= 80) not valid;
  end if;
end $$;

comment on column public.businesses.primary_area is
  'The neighborhood or area the owner confirmed, for example "East Austin". Null means city-wide questions only. Max 80 characters.';
