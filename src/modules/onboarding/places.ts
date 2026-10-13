import "server-only";
// Google Places Text Search (New) for auto-fill (MVP_SPEC 3.2, 26). Results only pre-fill the form;
// nothing here is stored except place_id (D-73).
import { z } from "zod";
import { getJson, postJson, type HttpDeps } from "./http";

export const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
// Only the fields the form uses. The phone number puts the call in the Enterprise tier either
// way, so websiteUri (same tier) costs nothing extra and lets us confirm the match.
export const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.primaryType",
  // Every type Google gives the listing, not only the primary one: a Tim Hortons is primaryType restaurant but
  // also lists cafe, so a website that says coffee shop can win (industry rule in service.ts).
  "places.types",
  "places.nationalPhoneNumber",
  "places.websiteUri",
].join(",");
const PAGE_SIZE = 5;

export type PlaceCandidate = {
  placeId: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  primaryType: string | null;
  /** All of the listing's Places types, primaryType included; empty when Google sends none. Pre-fill only. */
  types: string[];
  websiteUri: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  /** The listing's neighborhood, else its sublocality ("East Austin", "Brooklyn"). Pre-fill only. */
  area: string | null;
};

/** Throws when Places cannot be reached or refuses the request; an empty list means no match. */
export type SearchPlaces = (textQuery: string) => Promise<PlaceCandidate[]>;

const component = z.object({
  longText: z.string().nullish(),
  shortText: z.string().nullish(),
  types: z.array(z.string()).nullish(),
});

const searchResponse = z.object({
  places: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.object({ text: z.string().nullish() }).nullish(),
        formattedAddress: z.string().nullish(),
        addressComponents: z.array(component).nullish(),
        primaryType: z.string().nullish(),
        types: z.array(z.string()).nullish(),
        nationalPhoneNumber: z.string().nullish(),
        websiteUri: z.string().nullish(),
      }),
    )
    .nullish(),
});

export class PlacesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacesError";
  }
}

export function createPlacesSearch(apiKey: string, deps: HttpDeps = {}): SearchPlaces {
  return async (textQuery) => {
    const { status, body } = await postJson(
      PLACES_TEXT_SEARCH_URL,
      { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": PLACES_FIELD_MASK },
      { textQuery, pageSize: PAGE_SIZE },
      deps,
    );
    if (status < 200 || status >= 300) throw new PlacesError(`Places returned ${status}`);
    return toCandidates(body);
  };
}

/** One listing by its place_id, null when Google no longer has it. Throws when Places cannot be reached. */
export type LookupPlace = (placeId: string) => Promise<PlaceCandidate | null>;

// The details step opened again later: the listing is fetched live, never stored (D-73, BUG-139).
export function createPlaceLookup(apiKey: string, deps: HttpDeps = {}): LookupPlace {
  const fieldMask = PLACES_FIELD_MASK.replaceAll("places.", "");
  return async (placeId) => {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const { status, body } = await getJson(url, { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fieldMask }, deps);
    if (status === 404) return null;
    if (status < 200 || status >= 300) throw new PlacesError(`Places returned ${status}`);
    return toCandidates({ places: [body] })[0] ?? null;
  };
}

export function toCandidates(body: unknown): PlaceCandidate[] {
  const parsed = searchResponse.safeParse(body);
  if (!parsed.success) throw new PlacesError("Places sent an unexpected response");
  return (parsed.data.places ?? []).map((p) => {
    const part = (type: string, short = false) => {
      const c = p.addressComponents?.find((a) => a.types?.includes(type));
      return (short ? c?.shortText : c?.longText) || null;
    };
    return {
      placeId: p.id,
      name: p.displayName?.text || null,
      address: p.formattedAddress || null,
      phone: p.nationalPhoneNumber || null,
      primaryType: p.primaryType || null,
      types: p.types ?? [],
      websiteUri: p.websiteUri || null,
      city: part("locality") ?? part("postal_town"),
      state: part("administrative_area_level_1", true),
      country: part("country", true),
      area: part("neighborhood") ?? part("sublocality_level_1") ?? part("sublocality"),
    };
  });
}
