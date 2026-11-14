-- Migration 096: the business's street address (MVP_SPEC 3.1 step 4, F-34; 2026-11-14).
-- Additive (D-43): one nullable column with a length check, no data changed.
--
-- The details step and Settings ask for name, industry, city, state, phone and address; until now there was nowhere to
-- keep the address. It is what the owner typed or confirmed: Google Places may pre-fill the form, but a Places address
-- is never saved on its own (MVP_SPEC 26, D-73). Scans keep using the city and region for location; the street line is
-- for the owner's profile and the "same name, address and phone everywhere" advice.

alter table public.businesses
  add column if not exists street_address text check (char_length(street_address) <= 200);

comment on column public.businesses.street_address is
  'Street address the owner typed or confirmed (MVP_SPEC 3.1). Never copied from Google Places without confirmation (D-73).';
