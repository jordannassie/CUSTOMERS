// Hand-built competitor results for tests and for the dev server's Places fixture mode, so no real
// Google call is needed to see the competitor step. Made-up businesses; no provider was called.
import type { CompetitorCandidate, CompetitorPlaces, PlaceArea } from "./competitor-places";
import { SEARCH_TERMS } from "./competitors";

const candidate = (slug: string, name: string, rating: number | null, reviewCount: number | null, street: string, city = "Springfield") => ({
  placeId: `ChIJ-fixture-${slug}`,
  name,
  rating,
  reviewCount,
  address: `${street}, ${city}`,
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

/** Found only by name, in other cities: a business that moves from Austin to Dallas keeps only the Dallas one. */
export const AUSTIN_CANDIDATE: CompetitorCandidate = candidate("austin-bean", "Austin Bean Co", 4.4, 140, "1100 Congress Ave", "Austin");
export const DALLAS_CANDIDATE: CompetitorCandidate = candidate("dallas-roast", "Dallas Roast Co", 4.6, 230, "2500 Elm St", "Dallas");

/** A Google name that is a page title, found only by name (2026-10-15: the picker starts it on the brand). */
export const TITLE_CANDIDATE: CompetitorCandidate = candidate("berejuved", "BeRejuved Medical Spa & Wellness Studio - NYC", 4.8, 120, "12 W 23rd St");

const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const ALL = [...NEARBY_CANDIDATES, ...LOOKUP_CANDIDATES, AUSTIN_CANDIDATE, DALLAS_CANDIDATE, TITLE_CANDIDATE];

// The made-up cities above, as Google's address parts would name them.
const FIXTURE_REGIONS: Record<string, [string, string]> = {
  Springfield: ["Illinois", "IL"],
  Austin: ["Texas", "TX"],
  Dallas: ["Texas", "TX"],
  NYC: ["New York", "NY"],
};

/** Where a fixture place is, from the city at the end of its address. */
export function fixtureArea(c: CompetitorCandidate): PlaceArea {
  const city = c.address?.split(",").at(-1)?.trim() ?? "";
  return { cities: city ? [city] : [], regions: FIXTURE_REGIONS[city] ?? [], country: "US" };
}

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
  area: async (placeId) => {
    const found = ALL.find((c) => c.placeId === placeId);
    return found ? fixtureArea(found) : null;
  },
};

/** A fixture client that records its calls, or fails every call when given an error. */
export function fakeCompetitorPlaces(fail?: Error) {
  const calls = { search: [] as string[], details: [] as string[], area: [] as string[] };
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
    area: async (placeId) => {
      calls.area.push(placeId);
      if (fail) throw fail;
      return fixturePlaces.area!(placeId);
    },
  };
  return { places, calls };
}
