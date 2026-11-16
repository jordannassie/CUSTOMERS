// The wider competitor search when nothing similar is nearby (2026-11-16). A fake Places client; nothing goes out.
import { describe, expect, it } from "vitest";
import { AUSTIN_CANDIDATE, DALLAS_CANDIDATE } from "./competitor-fixtures";
import type { CompetitorCandidate, CompetitorPlaces } from "./competitor-places";
import { COMPETITOR_NOTES, discoverCompetitors, type BusinessForSearch } from "./competitors";
import { nearestPerChain } from "./competitor-fallback";

const DEALER: BusinessForSearch = { name: "Big Tex Auto Mart", industry: "Car dealer", services: [], city: "Dallas", region: "TX", placesId: null };

function placesAnswering(byQuery: Record<string, CompetitorCandidate[]>) {
  const calls: string[] = [];
  const places: CompetitorPlaces = {
    search: async (query) => {
      calls.push(query);
      return byQuery[query] ?? [];
    },
    details: async () => null,
  };
  return { places, calls };
}

describe("wider competitor search", () => {
  it("searches the whole state when nothing comes up near the business, and says so", async () => {
    const { places, calls } = placesAnswering({ "Car dealer in TX": [DALLAS_CANDIDATE, AUSTIN_CANDIDATE] });
    const { suggestions, note } = await discoverCompetitors(DEALER, places);

    expect(calls).toEqual(["Car dealer in Dallas, TX", "Car dealer in Dallas, TX", "Car dealer in TX"]);
    expect(suggestions.map((s) => s.name)).toEqual(["Dallas Roast Co", "Austin Bean Co"]);
    expect(note).toBe(COMPETITOR_NOTES.wider);
  });

  it("stops at the second search when dropping the type filter finds nearby ones", async () => {
    let n = 0;
    const places: CompetitorPlaces = { search: async () => (n++ === 0 ? [] : [DALLAS_CANDIDATE]), details: async () => null };
    const { suggestions, note } = await discoverCompetitors(DEALER, places);

    expect(n).toBe(2);
    expect(suggestions.map((s) => s.name)).toEqual(["Dallas Roast Co"]);
    expect(note).toBe(COMPETITOR_NOTES.wider);
  });

  it("still says none were found when Google has nothing even state-wide", async () => {
    const { places } = placesAnswering({});
    expect(await discoverCompetitors(DEALER, places)).toEqual({ suggestions: [], note: COMPETITOR_NOTES.noneFound });
  });

  it("keeps the nearest branch of each chain, with no distance limit", () => {
    const far = { ...DALLAS_CANDIDATE, placeId: "far", distanceM: 90_000 };
    const near = { ...DALLAS_CANDIDATE, placeId: "near", distanceM: 40_000 };
    expect(nearestPerChain([far, near, { ...AUSTIN_CANDIDATE, distanceM: 120_000 }]).map((c) => c.placeId)).toEqual(["near", AUSTIN_CANDIDATE.placeId]);
  });
});
