import "server-only";
// Google Places (New) calls for the competitor step (MVP_SPEC 3.1 step 5, 7.1). Everything returned
// here is for display only; the caller stores nothing but the place id and the user's chosen name (D-73).
import { z } from "zod";
import { getJson, postJson, type HttpDeps } from "./http";
import { PLACES_TEXT_SEARCH_URL, PlacesError } from "./places";
import { placeIdPattern } from "./schema";

export const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
// rating and userRatingCount put these calls in the Enterprise tier; nothing else we ask for costs more.
const FIELDS = ["id", "displayName", "rating", "userRatingCount", "shortFormattedAddress", "googleMapsUri"];
export const COMPETITOR_SEARCH_FIELD_MASK = FIELDS.map((f) => `places.${f}`).join(",");
export const COMPETITOR_DETAILS_FIELD_MASK = FIELDS.join(",");

/** Live Places values for one business. Never written to the database. */
export type CompetitorCandidate = {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  mapsUri: string | null;
};

export type CompetitorPlaces = {
  /** Throws PlacesError when Places cannot be reached; an empty list means no match. */
  search: (textQuery: string, pageSize: number) => Promise<CompetitorCandidate[]>;
  /** Null when the place no longer exists. */
  details: (placeId: string) => Promise<CompetitorCandidate | null>;
};

const place = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string().nullish() }).nullish(),
  rating: z.number().nullish(),
  userRatingCount: z.number().int().nullish(),
  shortFormattedAddress: z.string().nullish(),
  googleMapsUri: z.string().nullish(),
});

function toCandidate(p: z.infer<typeof place>): CompetitorCandidate | null {
  const name = p.displayName?.text?.trim();
  if (!name) return null;
  return {
    placeId: p.id,
    name,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    address: p.shortFormattedAddress || null,
    mapsUri: p.googleMapsUri || null,
  };
}

export function toCompetitorCandidates(body: unknown): CompetitorCandidate[] {
  const parsed = z.object({ places: z.array(place).nullish() }).safeParse(body);
  if (!parsed.success) throw new PlacesError("Places sent an unexpected response");
  return (parsed.data.places ?? []).flatMap((p) => toCandidate(p) ?? []);
}

export function createCompetitorPlaces(apiKey: string, deps: HttpDeps = {}): CompetitorPlaces {
  return {
    async search(textQuery, pageSize) {
      const { status, body } = await postJson(
        PLACES_TEXT_SEARCH_URL,
        { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": COMPETITOR_SEARCH_FIELD_MASK },
        { textQuery, pageSize },
        deps,
      );
      if (status < 200 || status >= 300) throw new PlacesError(`Places returned ${status}`);
      return toCompetitorCandidates(body);
    },
    async details(placeId) {
      if (!placeIdPattern.test(placeId)) return null;
      const { status, body } = await getJson(
        `${PLACES_DETAILS_URL}/${placeId}`,
        { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": COMPETITOR_DETAILS_FIELD_MASK },
        deps,
      );
      if (status === 404) return null;
      if (status < 200 || status >= 300) throw new PlacesError(`Places returned ${status}`);
      const parsed = place.safeParse(body);
      if (!parsed.success) throw new PlacesError("Places sent an unexpected response");
      return toCandidate(parsed.data);
    },
  };
}
