// Competitor step rules (MVP_SPEC 3.1 step 5, D-73): what to search for, which results to show, and
// what gets saved. Places values are only shown; a saved competitor is the user's name plus a place id.
import { isIndustry, type Industry } from "@/lib/industries";
import type { CompetitorCandidate, CompetitorPlaces } from "./competitor-places";

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

export function nearbyQuery(b: BusinessForSearch): string | null {
  const term = (b.industry && isIndustry(b.industry) ? SEARCH_TERMS[b.industry] : null) ?? b.services[0]?.trim();
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

export async function discoverCompetitors(b: BusinessForSearch, places: CompetitorPlaces): Promise<DiscoverResult> {
  if (!b.city?.trim()) return { suggestions: [], note: COMPETITOR_NOTES.noLocation };
  const query = nearbyQuery(b);
  if (!query) return { suggestions: [], note: COMPETITOR_NOTES.noCategory };
  let found: CompetitorCandidate[];
  try {
    // One extra result covers the business itself showing up in its own search.
    found = await places.search(query, MAX_SUGGESTIONS + 1);
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
