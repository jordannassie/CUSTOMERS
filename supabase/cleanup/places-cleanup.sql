-- Remove Google Places data that older code stored (B-79, D-73, MVP_SPEC 26).
-- Google lets us keep only the place id, so this keeps place_id and google_place_id and clears the rest.
--
-- Not a migration: run it by hand in the SQL editor, only after a backup and with the user's approval.
-- Safe to run more than once. It touches only tables and columns from migrations 004, 006 and 010,
-- so it works on live whether or not 021 onward has been applied.
-- Full notes: docs/launch/places-compliance.md.

-- =====================================================================================
-- Step 1: preview. Read only. Save the output with the backup.
-- =====================================================================================

-- 1a. Competitor suggestions that came from Google Places and the user never confirmed. Step 2 deletes these.
select id, business_id, name, domain, place_id, created_at
from public.business_competitors
where source = 'google_places' and not confirmed
order by business_id, created_at;

-- 1b. Competitors that still hold Places details (address, city, region, country, map position, category,
-- phone). Step 2 clears these columns and keeps name, domain and place_id.
select id, business_id, name, source, confirmed, place_id, formatted_address, city, region, country,
       latitude, longitude, category, phone, enrichment_status
from public.business_competitors
where (source = 'google_places' or place_id is not null or enrichment_status <> 'none')
  and (formatted_address is not null or city is not null or region is not null or country is not null
       or latitude is not null or longitude is not null or category is not null or phone is not null
       or enrichment_status <> 'none')
order by business_id, name;

-- 1c. Prospecting leads with Google ratings or review counts. Step 2 clears both.
select count(*) as leads_with_ratings
from public.prospecting_leads
where rating is not null or review_count is not null;

-- 1d. Totals, to compare with the checks at the end of step 2.
select
  (select count(*) from public.business_competitors) as competitors,
  (select count(*) from public.business_competitors where source = 'google_places' and not confirmed) as unconfirmed_places_names,
  (select count(*) from public.business_competitors where place_id is not null) as competitors_with_place_id,
  (select count(*) from public.prospecting_leads) as prospecting_leads;

-- =====================================================================================
-- Step 2: remove. Run the whole block at once, read the checks, then commit.
-- If any check is not what the preview predicts, run `rollback;` instead of `commit;`.
-- =====================================================================================

begin;

-- Names Google suggested that the user never picked (MVP_SPEC 26: competitor names must be the user's).
delete from public.business_competitors
where source = 'google_places' and not confirmed;

-- The same set of columns the onboarding save clears (CLEARED_PLACES_COLUMNS), except place_id, which we may keep.
-- Manual rows with no place id are left alone: those values were typed by the user.
update public.business_competitors
set formatted_address = null,
    city = null,
    region = null,
    country = null,
    latitude = null,
    longitude = null,
    category = null,
    phone = null,
    enrichment_status = 'none'
where (source = 'google_places' or place_id is not null or enrichment_status <> 'none')
  and (formatted_address is not null or city is not null or region is not null or country is not null
       or latitude is not null or longitude is not null or category is not null or phone is not null
       or enrichment_status <> 'none');

-- Google ratings and review counts saved by the old prospecting search.
update public.prospecting_leads
set rating = null,
    review_count = null
where rating is not null or review_count is not null;

-- Checks: all three should be 0, and competitors_with_place_id should match step 1d
-- less any unconfirmed rows from 1a that had a place id.
select
  (select count(*) from public.business_competitors where source = 'google_places' and not confirmed) as unconfirmed_left,
  (select count(*) from public.business_competitors
    where (source = 'google_places' or place_id is not null or enrichment_status <> 'none')
      and (formatted_address is not null or city is not null or region is not null or country is not null
           or latitude is not null or longitude is not null or category is not null or phone is not null
           or enrichment_status <> 'none')) as places_details_left,
  (select count(*) from public.prospecting_leads where rating is not null or review_count is not null) as ratings_left,
  (select count(*) from public.business_competitors where place_id is not null) as competitors_with_place_id;

commit;

-- =====================================================================================
-- Step 3: waits for Jordan's decision (open question in docs/launch/places-compliance.md).
-- Prospecting leads also hold names, addresses, phones and websites copied from Places, and legacy
-- competitors from Places hold a website domain. Leave this commented out until it is decided.
-- =====================================================================================

-- begin;
-- update public.prospecting_leads
-- set address = null, phone = null, website = null, google_maps_url = null, category = null, city = null, state = null;
-- update public.business_competitors set domain = null where source = 'google_places';
-- commit;
