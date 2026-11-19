import { describe, expect, it } from "vitest";
import type { CompetitorCandidate } from "@/modules/onboarding";
import { topSuggestions } from "./top-suggestions";

const place = (placeId: string, name: string): CompetitorCandidate => ({ placeId, name, rating: null, reviewCount: null, address: null, mapsUri: null });

describe("topSuggestions", () => {
  it("ticks the first suggestions in Google's order, up to the count", () => {
    const picks = topSuggestions([place("a", "Bean House"), place("b", "Blue Door"), place("c", "Daily Grind"), place("d", "Fourth")], 3);
    expect(picks.map((p) => p.name)).toEqual(["Bean House", "Blue Door", "Daily Grind"]);
    expect(picks[0].placesId).toBe("a");
  });

  it("skips a second branch of the same brand", () => {
    const picks = topSuggestions([place("a", "Pizza Hut"), place("b", "pizza hut "), place("c", "Domino's")], 2);
    expect(picks.map((p) => p.placesId)).toEqual(["a", "c"]);
  });

  it("ticks nothing when there are no suggestions", () => {
    expect(topSuggestions([], 3)).toEqual([]);
  });
});
