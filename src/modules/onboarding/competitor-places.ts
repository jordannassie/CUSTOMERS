import "server-only";
// Google Places (New) calls for the competitor step (MVP_SPEC 3.1 step 5, 7.1). Everything returned
// here is for display only; the caller stores nothing but the place id and the user's chosen name (D-73).
import { z } from "zod";
import { getJson, postJson, type HttpDeps } from "./http";
import { PLACES_TEXT_SEARCH_URL, PlacesError } from "./places";
import { placeIdPattern } from "./schema";

export const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
// rating and userRatingCount put these calls in the Enterprise tier; nothing else we ask for costs more.
// primaryType ranks suggestions of the business's own kind first (2026-10-14); shown nowhere, never stored.
// location and websiteUri (same tier) tell branches of one chain apart and find the nearest (2026-10-27); used only
// while choosing, never shown as stored data and never saved.
const FIELDS = ["id", "displayName", "rating", "userRatingCount", "shortFormattedAddress", "googleMapsUri", "primaryType", "location", "websiteUri"];
export const COMPETITOR_SEARCH_FIELD_MASK = FIELDS.map((f) => `places.${f}`).join(",");
// Details only show a saved competitor's rating and reviews: no location or website (those pick a branch in search).
export const COMPETITOR_DETAILS_FIELD_MASK = FIELDS.filter((f) => f !== "location" && f !== "websiteUri").join(",");
// The business's own place, read live to search near it (never stored, MVP_SPEC 26).
export const ORIGIN_FIELD_MASK = "location,primaryType";
// A saved competitor's city, region and country, read live when the business moves (Essentials tier, never stored).
export const AREA_FIELD_MASK = "addressComponents";
// The competitor step waits on these calls; a slow Google should show "add by name" quickly (BUG-088).
export const COMPETITOR_TIMEOUT_MS = 8_000;
// Results are biased to this circle around the business, not limited to it.
export const NEARBY_RADIUS_M = 20_000;

/** Live Places values for one business. Never written to the database. */
export type CompetitorCandidate = {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  mapsUri: string | null;
  /** Google's type, to put suggestions of the business's own kind first. */
  primaryType?: string | null;
  /** Where it is and its website, to keep one branch of a chain near the business (branches.ts). Never stored. */
  location?: { latitude: number; longitude: number } | null;
  website?: string | null;
  /** Meters from the business, when both locations are known, and the same said for the screen ("0.5 mi away"). */
  distanceM?: number | null;
  distance?: string | null;
};

/** Where a place is: its city names (town, borough), region names (long and short) and country code. Never stored. */
export type PlaceArea = { cities: string[]; regions: string[]; country: string | null };

/** Where the business is and its Google type, so suggestions are nearby businesses of the same kind (BUG-085). */
export type Origin = { latitude: number; longitude: number; primaryType: string | null };

export type CompetitorPlaces = {
  /** Throws PlacesError when Places cannot be reached; an empty list means no match. */
  /** `orType`: the type to keep when the business's own type is unknown ("fast_food_restaurant" for a fast food place). */
  search: (textQuery: string, pageSize: number, near?: Origin | null, sameType?: boolean, orType?: string | null) => Promise<CompetitorCandidate[]>;
  /** The business's own location and type, or null when Places has none. */
  origin?: (placeId: string) => Promise<Origin | null>;
  /** Null when the place no longer exists. */
  details: (placeId: string) => Promise<CompetitorCandidate | null>;
  /** Where a saved competitor is. Throws PlacesError when Places cannot be reached; null when the place is gone. */
  area?: (placeId: string) => Promise<PlaceArea | null>;
};

const place = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string().nullish() }).nullish(),
  rating: z.number().nullish(),
  userRatingCount: z.number().int().nullish(),
  shortFormattedAddress: z.string().nullish(),
  googleMapsUri: z.string().nullish(),
  primaryType: z.string().nullish(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).nullish(),
  websiteUri: z.string().nullish(),
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
    ...(p.primaryType ? { primaryType: p.primaryType } : {}),
    ...(p.location ? { location: p.location } : {}),
    ...(p.websiteUri ? { website: p.websiteUri } : {}),
  };
}

export function toCompetitorCandidates(body: unknown): CompetitorCandidate[] {
  const parsed = z.object({ places: z.array(place).nullish() }).safeParse(body);
  if (!parsed.success) throw new PlacesError("Places sent an unexpected response");
  return (parsed.data.places ?? []).flatMap((p) => toCandidate(p) ?? []);
}

const origin = z.object({
  location: z.object({ latitude: z.number(), longitude: z.number() }).nullish(),
  primaryType: z.string().nullish(),
});

const CITY_TYPES = ["locality", "postal_town", "sublocality", "sublocality_level_1", "administrative_area_level_3"];
const components = z.object({
  addressComponents: z
    .array(z.object({ longText: z.string().nullish(), shortText: z.string().nullish(), types: z.array(z.string()).nullish() }))
    .nullish(),
});

/** The city, region and country names in a Place Details addressComponents answer. */
export function toPlaceArea(body: unknown): PlaceArea {
  const parsed = components.safeParse(body);
  if (!parsed.success) throw new PlacesError("Places sent an unexpected response");
  const list = parsed.data.addressComponents ?? [];
  const names = (types: string[]) =>
    [...new Set(list.filter((c) => c.types?.some((t) => types.includes(t))).flatMap((c) => [c.longText, c.shortText]).filter((n): n is string => !!n?.trim()))];
  const country = list.find((c) => c.types?.includes("country"))?.shortText?.trim().toUpperCase() || null;
  return { cities: names(CITY_TYPES), regions: names(["administrative_area_level_1"]), country };
}

export function searchBody(textQuery: string, pageSize: number, near: Origin | null | undefined, sameType: boolean, orType?: string | null) {
  const type = sameType ? (near?.primaryType ?? orType ?? null) : null;
  return {
    textQuery,
    pageSize,
    ...(near
      ? { locationBias: { circle: { center: { latitude: near.latitude, longitude: near.longitude }, radius: NEARBY_RADIUS_M } } }
      : {}),
    ...(type ? { includedType: type } : {}),
  };
}

export function createCompetitorPlaces(apiKey: string, deps: HttpDeps = {}): CompetitorPlaces {
  deps = { timeoutMs: COMPETITOR_TIMEOUT_MS, ...deps };
  const searchOnce = (body: unknown) =>
    postJson(PLACES_TEXT_SEARCH_URL, { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": COMPETITOR_SEARCH_FIELD_MASK }, body, deps);
  return {
    async search(textQuery, pageSize, near, sameType = false, orType = null) {
      const first = searchBody(textQuery, pageSize, near, sameType, orType);
      let { status, body } = await searchOnce(first);
      // A place type Text Search does not accept as a filter: search again without it.
      if (status === 400 && "includedType" in first) ({ status, body } = await searchOnce(searchBody(textQuery, pageSize, near, false)));
      if (status < 200 || status >= 300) throw new PlacesError(`Places returned ${status}`);
      return toCompetitorCandidates(body);
    },
    async origin(placeId) {
      if (!placeIdPattern.test(placeId)) return null;
      const { status, body } = await getJson(
        `${PLACES_DETAILS_URL}/${placeId}`,
        { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": ORIGIN_FIELD_MASK },
        deps,
      );
      if (status < 200 || status >= 300) return null;
      const parsed = origin.safeParse(body);
      if (!parsed.success || !parsed.data.location) return null;
      return { ...parsed.data.location, primaryType: parsed.data.primaryType ?? null };
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
    async area(placeId) {
      if (!placeIdPattern.test(placeId)) return null;
      const { status, body } = await getJson(
        `${PLACES_DETAILS_URL}/${placeId}`,
        { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": AREA_FIELD_MASK },
        deps,
      );
      if (status === 404) return null;
      if (status < 200 || status >= 300) throw new PlacesError(`Places returned ${status}`);
      return toPlaceArea(body);
    },
  };
}
