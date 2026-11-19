-- Migration 068: competitors follow the business's location (2026-10-16, MVP_SPEC 3.1 step 5). Additive only (D-43):
-- three nullable columns on businesses, nothing backfilled.
--
-- When the city, region or country of a business changes (Back to the details step in setup, or Settings), the
-- competitors picked from Google for the old place are checked live against the new one, and those elsewhere are
-- removed. Only place ids are stored (D-73), so nothing about a competitor's address is saved here.
--
--   location_changed_at       when the city, region or country last changed while competitors were saved. A
--                             competitor added by name (no Google listing) before it says "check it is near <city>".
--   competitors_removed       how many competitors that change removed, shown once on the competitor list.
--   competitors_removed_from  the business's old city (or region) for that note: "We removed 2 competitors from Austin."
--
-- All three are cleared when the user saves the competitor list again.

alter table public.businesses add column if not exists location_changed_at timestamptz;
alter table public.businesses add column if not exists competitors_removed integer;
alter table public.businesses add column if not exists competitors_removed_from text[];
