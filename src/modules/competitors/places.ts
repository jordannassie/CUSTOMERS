import "server-only";
// Google Places signals for the side-by-side table (MVP_SPEC 7.1, 26, D-73). Fetched live when the
// page is shown and kept only in memory for that request; nothing here is ever written to the database.
import { z } from "zod";

export const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
// All Enterprise tier, the same tier the rating already puts the call in.
export const SIGNALS_FIELD_MASK = [
  "id",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "types",
  "websiteUri",
  "regularOpeningHours.weekdayDescriptions",
  "googleMapsUri",
].join(",");
const TIMEOUT_MS = 10_000;
// Same shape the onboarding client checks before calling Places.
const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

export type PlaceSignals = {
  rating: number | null;
  reviewCount: number | null;
  /** Plain-language categories, most specific first. */
  categories: string[];
  website: string | null;
  /** One line per day as Google writes it ("Monday: 7:00 AM to 6:00 PM"); null when Google has none. */
  hours: string[] | null;
  mapsUri: string | null;
};

/** Null when the place no longer exists; throws when Places cannot be reached. */
export type FetchSignals = (placeId: string) => Promise<PlaceSignals | null>;

export class PlacesUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacesUnavailable";
  }
}

const details = z.object({
  rating: z.number().nullish(),
  userRatingCount: z.number().int().nullish(),
  primaryTypeDisplayName: z.object({ text: z.string().nullish() }).nullish(),
  types: z.array(z.string()).nullish(),
  websiteUri: z.string().nullish(),
  regularOpeningHours: z.object({ weekdayDescriptions: z.array(z.string()).nullish() }).nullish(),
  googleMapsUri: z.string().nullish(),
});

// Types every place has; they say nothing a customer would compare.
const GENERIC_TYPES = new Set(["point_of_interest", "establishment", "store", "food", "service", "health"]);

const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function toSignals(body: unknown): PlaceSignals {
  const parsed = details.safeParse(body);
  if (!parsed.success) throw new PlacesUnavailable("Places sent an unexpected response");
  const p = parsed.data;
  const labels = [p.primaryTypeDisplayName?.text?.trim(), ...(p.types ?? []).filter((t) => !GENERIC_TYPES.has(t)).map(typeLabel)];
  const categories: string[] = [];
  for (const label of labels) {
    if (label && !categories.some((c) => c.toLowerCase() === label.toLowerCase())) categories.push(label);
  }
  return {
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    categories: categories.slice(0, 3),
    website: p.websiteUri || null,
    hours: p.regularOpeningHours?.weekdayDescriptions?.length ? p.regularOpeningHours.weekdayDescriptions : null,
    mapsUri: p.googleMapsUri || null,
  };
}

export function createPlaceSignals(apiKey: string, doFetch: typeof fetch = fetch): FetchSignals {
  return async (placeId) => {
    if (!PLACE_ID.test(placeId)) return null;
    let res: Response;
    try {
      res = await doFetch(`${PLACES_DETAILS_URL}/${placeId}`, {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": SIGNALS_FIELD_MASK },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // Places content may not be cached (MVP_SPEC 26), so never let the fetch cache keep it.
        cache: "no-store",
      });
    } catch (err) {
      throw new PlacesUnavailable(err instanceof Error ? err.message : "Places could not be reached");
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new PlacesUnavailable(`Places returned ${res.status}`);
    return toSignals(await res.json().catch(() => null));
  };
}
