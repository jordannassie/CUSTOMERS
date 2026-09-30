# Google Places compliance (B-79)

How the app uses Google Places data, checked on 2026-10-01 against the code on `mvp` and Google's current rules. Decision: D-73. Spec: MVP_SPEC 26. This is our reading, not legal advice; the open questions at the end need Jordan or a lawyer.

## The rules we rely on

From the Places API policies page (developers.google.com/maps/documentation/places/web-service/policies, "Last updated 2026-09-24 UTC", read 2026-10-01):

- Storage: "The place ID, used to uniquely identify a place, is exempt from the caching restrictions. You can therefore store place ID values indefinitely."
- No map: "When displaying Places API data without a Google Map, you must include the Google logo, adhering to the provided style guidelines and attribution requirements."
- Logo or text: "Attribution should take the form of the Google Maps logo whenever possible. In cases where space is limited, the text Google Maps is acceptable."
- Logo size: minimum height 16dp, maximum 19dp; clear space 10dp left, right and top, 5dp below.
- Text, if used: "Don't modify the text Google Maps in any way", Roboto (or sans serif), weight 400, color white, black (#1F1F1F) or gray (#5E5E5E), 12 to 16sp.
- Placement: "Don't remove included attribution regardless of where it is displayed. Don't alter, hide, or obscure the attribution and make sure it is clearly visible against the background." "Position attribution near the top or bottom of the content, and within the same visual container."
- Reviews and photos: "You must always credit the author when displaying photos or reviews." We show neither, only the rating and the review count.

From the Google Maps Platform Terms and Service Specific Terms, as quoted in MVP_SPEC 26 (read 2026-09-26):

- Must not "copy and save business names, addresses, or user reviews" (3.2.3(a)(iii)), cache anything else (3.2.3(b)), or "create content based on Google Maps Content" (3.2.3(c)).
- Latitude and longitude may be kept for up to 30 days (Places API 14.3).
- Places data may be shown without a Google map (14.1), but never on a non-Google map (14.2). We show no maps.

## What we store

| Where | What | Why it is allowed |
|---|---|---|
| `businesses.places_id` | Place id of the user's own business | Place id only |
| `business_competitors.places_id` (021), `business_competitors.place_id` (010, older code) | Place id of each competitor | Place id only. Current code reads `place_id` as a fallback, so it is kept |
| `prospecting_leads.google_place_id` (004) | Place id of each old prospecting lead | Place id only |
| `businesses` name, phone, city, region, country, industry | The user's own business details | Places only pre-fills the onboarding form. The user checks and saves it, so the saved record is their own confirmation (MVP_SPEC 26) |
| `business_competitors.name` | Competitor names | Picked or typed by the user. See open question 2 |
| `business_site_facts.data` | Facts from the business's own website | Not from Places |
| `opportunities` evidence, why it matters, steps | Text with placeholders such as `{c1.review_count}` | Numbers are filled in live when the page is shown, never stored. See open question 3 for titles |

Nothing else from Places is written by current code. The onboarding competitor save also clears the old Places columns on every row it keeps (`CLEARED_PLACES_COLUMNS`, `src/modules/onboarding/competitors.ts`).

## What we fetch live

Each call is made when a page is shown, with no cache beyond one request.

| Code | Fields | Used on |
|---|---|---|
| `src/modules/competitors/places.ts` | rating, review count, category, types, website, opening hours, Maps link | Competitors page, share page, PDF, Opportunities (placeholder values), AI writer (comparisons only) |
| `src/modules/onboarding/places.ts` | name, address, address parts, type, phone, website | Onboarding details pre-fill |
| `src/modules/onboarding/competitor-places.ts` | name, rating, review count, short address, Maps link | Onboarding competitor suggestions and "add by name" |

The AI writer gets only comparisons ("more", "fewer", "higher") and placeholder names, never the values (`src/modules/insights/prompts/explain.v1.ts`).

## Where attribution shows

All surfaces use one component, `GoogleAttribution` (`src/components/onboarding/PlaceBits.tsx`). B-79 changed it from the words "Google Maps" in our secondary text color (#6B6B67, which is not one of Google's allowed colors) to Google's own gray Google Maps logo (`public/images/google-maps-logo.svg`, unmodified from Google's attribution asset pack), 16px tall, with the clear space above. Screen readers read "... from Google Maps".

| Surface | Places data shown | Attribution |
|---|---|---|
| Competitors page, "Side by side on Google" | Rating, reviews, category, website, hours | Logo under the table, same card (`SignalsTable.tsx`) |
| Share page `/r/<token>` | Same table | Same component, same card (`Report.tsx`) |
| PDF export | Prints the share page | Same as the share page |
| Onboarding, business details | Name, phone, city, industry pre-filled | "Business details from" plus logo, in the pre-fill note (`DetailsStep.tsx`) |
| Onboarding, competitor suggestions | Names, ratings, reviews | Logo under the list, same box (`CompetitorPicker.tsx`) |
| Onboarding, add by name | Names, addresses, ratings | Logo under the matches, same box (`AddCompetitor.tsx`) |
| Opportunities | Review counts and ratings filled into the text | Logo inside the card when a value is filled in (`OpportunityCard.tsx`) |
| Overview | No Places values. Top opportunities show stored titles only | None needed. See open question 3 |

## Fixes in B-79

1. `POST /api/geo/competitors` (old route, no screen calls it) saved address, city, region, country, latitude, longitude, category and phone from Places. It now saves only `place_id` with the name, domain and source it saved before. Test: `src/app/api/geo/competitors/route.test.ts`.
2. Attribution now uses the Google Maps logo, as Google asks "whenever possible".
3. `supabase/cleanup/places-cleanup.sql` removes what older code stored (below).

## Cleanup of old data

`supabase/cleanup/places-cleanup.sql` is not a migration. Run it by hand on live (and customers-dev) only after a backup and with approval. It works before or after migrations 021 onward and is safe to run twice.

1. Step 1 previews what will change. Save the output with the backup.
2. Step 2, in one transaction:
   - deletes competitor rows with `source = 'google_places'` that the user never confirmed;
   - clears address, city, region, country, latitude, longitude, category and phone on competitor rows that came from Places, keeping name, domain and `place_id` (rows the user typed with no place id are left alone);
   - clears `rating` and `review_count` on `prospecting_leads`;
   - then prints checks that must all be 0 before `commit`.
3. Step 3 is commented out and waits for open question 4.

Tested on a local stack: the unconfirmed suggestion was deleted, the confirmed Places row lost its address, phone and map position but kept its name and place id, the typed row kept its values, and a second run changed nothing.

Effect on scans: the scan matches competitor mentions by name, domain, phone and city. After the cleanup, competitors that came from Places match by name and domain only, the same as after any onboarding save today.

## Still to clean up later

- `GET /api/geo/competitors/search`, `POST /api/geo/competitors/discover`, `src/lib/google-places.ts` and `src/lib/geo/competitor-*.ts` return Places data but no screen uses them. They also ignore `PLACES_FIXTURES`, so they call Google whenever a key is set. They store nothing. Suggest removing them in a later task.
- `business_competitors` still has the old Places columns, and `prospecting_leads` still has its Places columns. Dropping them needs a migration after the MVP is live (D-43).

## Open questions for Jordan or a lawyer (D-73)

1. Is our overall reading of the terms above right?
2. Competitor names: when a user ticks a Google suggestion, we save that name as theirs. Does picking count as the user's own confirmation, the same as a typed name?
3. Stored opportunity titles such as "Bean House has more Google reviews than you" state a comparison worked out from Google data (the numbers are never stored). Is that "content based on Google Maps Content" (3.2.3(c))? If yes, titles should use a live placeholder too.
4. Old prospecting leads (`prospecting_leads`) hold business names, addresses, phones, websites and Maps links copied from Places, and old competitor rows from Places hold a website domain. Should step 3 of the cleanup clear them? It would remove Jordan's old lead list details, keeping the place id.
5. `prospecting_leads.lead_score` was worked out from Places rating, phone and website. Keep or clear?
