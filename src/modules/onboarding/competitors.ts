// Competitor step rules (MVP_SPEC 3.1 step 5, D-73): what to search for, which results to show, and
// what gets saved. Places values are only shown; a saved competitor is the user's name plus a place id.
import { isIndustry, type Industry } from "@/lib/industries";
import type { CompetitorCandidate, CompetitorPlaces, Origin } from "./competitor-places";

export const MAX_SUGGESTIONS = 10;
export const MAX_LOOKUP_RESULTS = 5;

// What a customer would type into Google Maps. "other" has no good term, so the first service is used.
export const SEARCH_TERMS: Record<Industry, string | null> = {
  dentist: "dentist",
  lawyer: "lawyer",
  restaurant: "restaurant",
  coffee_shop: "coffee shop",
  plumber: "plumber",
  hvac: "HVAC contractor",
  med_spa: "med spa",
  real_estate: "real estate agent",
  auto_repair: "auto repair shop",
  salon: "hair salon",
  other: null,
};

export type BusinessForSearch = {
  name: string;
  industry: string | null;
  services: string[];
  city: string | null;
  region: string | null;
  placesId: string | null;
};

export const COMPETITOR_NOTES = {
  noLocation: "Add your city in the business details so we can find competitors near you. You can still add them by name below.",
  noCategory: "Add your industry in the business details so we can suggest competitors. You can still add them by name below.",
  unavailable: "We couldn't load suggestions from Google right now. You can add competitors by name below.",
  noneFound: "We didn't find similar businesses nearby. Add the ones you compete with by name below.",
} as const;

export function limitMessage(limit: number): string {
  return `Your plan tracks up to ${limit} competitors.`;
}

function area(b: BusinessForSearch): string {
  return [b.city, b.region].map((s) => s?.trim()).filter(Boolean).join(", ");
}

/**
 * What the business is, as typed into Google Maps: our term for a listed industry, the user's own words for any
 * other ("Sportswear store", BUG-085), then its Google type ("clothing_store"), then its first service.
 */
function searchTerm(b: BusinessForSearch, origin: Origin | null): string | null {
  if (b.industry && isIndustry(b.industry)) {
    const term = SEARCH_TERMS[b.industry];
    if (term) return term;
  } else if (b.industry?.trim()) {
    return b.industry.trim();
  }
  return origin?.primaryType?.replace(/_/g, " ") || b.services[0]?.trim() || null;
}

export function nearbyQuery(b: BusinessForSearch, origin: Origin | null = null): string | null {
  const term = searchTerm(b, origin);
  if (!term || !b.city?.trim()) return null;
  return `${term} in ${area(b)}`;
}

/** "Add by name": searching near the business finds the right branch of a chain. */
export function lookupQuery(name: string, b: BusinessForSearch): string {
  const where = area(b);
  return where ? `${name.trim()} in ${where}` : name.trim();
}

const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Drops the business itself and repeated places, keeping Google's order. */
export function withoutOwnBusiness(candidates: CompetitorCandidate[], b: BusinessForSearch, max: number): CompetitorCandidate[] {
  const seen = new Set<string>();
  return candidates
    .filter((c) => {
      if (seen.has(c.placeId)) return false;
      seen.add(c.placeId);
      return c.placeId !== b.placesId && plain(c.name) !== plain(b.name);
    })
    .slice(0, max);
}

export type DiscoverResult = { suggestions: CompetitorCandidate[]; note: string | null };

/** The business's own place, read live; null when it has none or Google cannot say. */
export async function originOf(b: BusinessForSearch, places: CompetitorPlaces): Promise<Origin | null> {
  if (!b.placesId || !places.origin) return null;
  return places.origin(b.placesId).catch(() => null);
}

export async function discoverCompetitors(b: BusinessForSearch, places: CompetitorPlaces): Promise<DiscoverResult> {
  if (!b.city?.trim()) return { suggestions: [], note: COMPETITOR_NOTES.noLocation };
  const origin = await originOf(b, places);
  const query = nearbyQuery(b, origin);
  if (!query) return { suggestions: [], note: COMPETITOR_NOTES.noCategory };
  let found: CompetitorCandidate[];
  try {
    // Near the business and of its own Google type (BUG-085). One extra result covers the business itself.
    found = await places.search(query, MAX_SUGGESTIONS + 1, origin, true);
  } catch {
    return { suggestions: [], note: COMPETITOR_NOTES.unavailable };
  }
  const suggestions = withoutOwnBusiness(found, b, MAX_SUGGESTIONS);
  return { suggestions, note: suggestions.length ? null : COMPETITOR_NOTES.noneFound };
}

export type ConfirmedCompetitor = { name: string; placesId: string | null };
export type SavedCompetitorRow = { id: string; name: string };

// Matches the unique index on (business_id, lower(name)).
export const nameKey = (name: string) => name.trim().toLowerCase();

/** One entry per name and per place, first one wins. */
export function dedupeConfirmed(list: ConfirmedCompetitor[]): ConfirmedCompetitor[] {
  const names = new Set<string>();
  const placeIds = new Set<string>();
  const out: ConfirmedCompetitor[] = [];
  for (const c of list) {
    const name = c.name.trim();
    if (!name || names.has(nameKey(name)) || (c.placesId && placeIds.has(c.placesId))) continue;
    names.add(nameKey(name));
    if (c.placesId) placeIds.add(c.placesId);
    out.push({ name, placesId: c.placesId });
  }
  return out;
}

export type SavePlan = {
  remove: string[];
  keep: { id: string; competitor: ConfirmedCompetitor }[];
  add: ConfirmedCompetitor[];
};

/** Turns the confirmed list into row changes, keeping the ids of rows the user left in. */
export function planSave(existing: SavedCompetitorRow[], wanted: ConfirmedCompetitor[]): SavePlan {
  const byName = new Map(existing.map((row) => [nameKey(row.name), row.id]));
  const keep: SavePlan["keep"] = [];
  const add: ConfirmedCompetitor[] = [];
  for (const competitor of wanted) {
    const id = byName.get(nameKey(competitor.name));
    if (id) keep.push({ id, competitor });
    else add.push(competitor);
  }
  const kept = new Set(keep.map((k) => k.id));
  return { remove: existing.filter((row) => !kept.has(row.id)).map((row) => row.id), keep, add };
}

// Older code copied Places details into these columns; every save clears them (MVP_SPEC 26).
export const CLEARED_PLACES_COLUMNS = {
  place_id: null,
  formatted_address: null,
  city: null,
  region: null,
  country: null,
  latitude: null,
  longitude: null,
  category: null,
  phone: null,
  enrichment_status: "none",
} as const;

export function competitorFields(c: ConfirmedCompetitor) {
  return {
    name: c.name,
    places_id: c.placesId,
    // The name is always the user's; the source only says whether a place id is attached.
    source: c.placesId ? "confirmed_place" : "manual",
    confirmed: true,
  };
}

/**
 * The Google listing for a business AI named, when one of the lookup's results is clearly it: "Canopy" matches
 * "Canopy by Hilton Austin Downtown", and "Blue Door Coffee" matches "Blue Door Coffee". Null when none does, so a
 * near miss is never saved as that business (step 9c).
 */
export function matchingPlace(name: string, candidates: CompetitorCandidate[]): CompetitorCandidate | null {
  const want = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (want.replace(/ /g, "").length < 4) return null;
  const plainName = (c: CompetitorCandidate) => c.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const exact = candidates.find((c) => plainName(c) === want);
  if (exact) return exact;
  // A longer or shorter form only when it is the one result that fits: two "Canopy ..." places are a guess.
  const close = candidates.filter((c) => plainName(c).startsWith(`${want} `) || want.startsWith(`${plainName(c)} `));
  return close.length === 1 ? close[0] : null;
}
