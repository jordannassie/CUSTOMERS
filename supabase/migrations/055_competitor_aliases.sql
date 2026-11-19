-- Migration 055: other names for tracked competitors (MVP_SPEC 5.5). Additive only (D-43): one new column with a
-- default, so every existing row reads as "no other names" and nothing is rewritten.
--
-- A competitor is often named another way in AI answers: "KFC" for "Kentucky Fried Chicken", an old name, a short
-- form. businesses.aliases already does this for the business itself (migration 021); this gives each competitor the
-- same list. Users cannot write business_competitors (migration 047, SEC-10); the app saves it with the service role
-- after checking the business is theirs. Up to 10 names, each 2 to 120 characters, like the business's own.

alter table public.business_competitors
  add column if not exists aliases text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'business_competitors_aliases_count') then
    alter table public.business_competitors
      add constraint business_competitors_aliases_count check (cardinality(aliases) <= 10);
  end if;
end $$;
