// Hand-built competitor results for tests and for the dev server's Places fixture mode, so no real
// Google call is needed to see the competitor step. Made-up businesses; no provider was called.
import type { CompetitorCandidate, CompetitorPlaces } from "./competitor-places";
import { SEARCH_TERMS } from "./competitors";

const candidate = (slug: string, name: string, rating: number | null, reviewCount: number | null, street: string) => ({
  placeId: `ChIJ-fixture-${slug}`,
  name,
  rating,
  reviewCount,
  address: `${street}, Springfield`,
  mapsUri: `https://maps.google.com/?cid=fixture-${slug}`,
});

/** The business being set up, as Places would return it among its own competitors. */
export const OWN_CANDIDATE: CompetitorCandidate = candidate("sunrise-coffee", "Sunrise Coffee Bar", 4.2, 12, "120 Main St");

export const NEARBY_CANDIDATES: CompetitorCandidate[] = [
  candidate("bean-house", "Bean House", 4.7, 320, "88 Oak Ave"),
  OWN_CANDIDATE,
  candidate("daily-grind", "The Daily Grind", 4.5, 211, "14 Elm St"),
  candidate("copper-kettle", "Copper Kettle Cafe", 4.6, 158, "301 Market St"),
  candidate("north-roasters", "North Side Roasters", 4.8, 96, "9 Lake Rd"),
  candidate("morning-ritual", "Morning Ritual Coffee", 4.3, 74, "455 Pine St"),
  candidate("lantern-espresso", "Lantern Espresso", 4.4, 61, "22 Cedar Ln"),
  candidate("oat-and-honey", "Oat & Honey", 4.1, 47, "700 River Dr"),
  candidate("third-street", "Third Street Coffee", 3.9, 33, "3 Third St"),
  candidate("parlor-cafe", "Parlor Cafe", 4.6, 28, "610 Maple Ave"),
  candidate("kiln-coffee", "Kiln Coffee Co", null, null, "18 Birch St"),
  candidate("tiny-cup", "Tiny Cup", 5, 4, "71 Ash St"),
];

/** Places matches for "add by name" (a name not in the nearby list). */
export const LOOKUP_CANDIDATES: CompetitorCandidate[] = [
  candidate("blue-door", "Blue Door Coffee", 4.5, 402, "5 Harbor Way"),
  candidate("blue-door-2", "Blue Door Coffee Downtown", 4.2, 88, "90 Center St"),
];

const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const ALL = [...NEARBY_CANDIDATES, ...LOOKUP_CANDIDATES];

const CATEGORY_TERMS = new Set(Object.values(SEARCH_TERMS).flatMap((t) => (t ? plain(t) : [])));

// Any category search ("plumber in Springfield, IL") gets the nearby list; anything else is a name lookup.
function answer(textQuery: string, pageSize: number): CompetitorCandidate[] {
  const what = plain(textQuery.split(" in ")[0] ?? textQuery);
  if (CATEGORY_TERMS.has(what)) return NEARBY_CANDIDATES.slice(0, pageSize);
  return ALL.filter((c) => plain(c.name).includes(what)).slice(0, pageSize);
}

export const fixturePlaces: CompetitorPlaces = {
  search: async (textQuery, pageSize) => answer(textQuery, pageSize),
  details: async (placeId) => ALL.find((c) => c.placeId === placeId) ?? null,
};

/** A fixture client that records its calls, or fails every call when given an error. */
export function fakeCompetitorPlaces(fail?: Error) {
  const calls = { search: [] as string[], details: [] as string[] };
  const places: CompetitorPlaces = {
    search: async (query, pageSize) => {
      calls.search.push(query);
      if (fail) throw fail;
      return fixturePlaces.search(query, pageSize);
    },
    details: async (placeId) => {
      calls.details.push(placeId);
      if (fail) throw fail;
      return fixturePlaces.details(placeId);
    },
  };
  return { places, calls };
}
