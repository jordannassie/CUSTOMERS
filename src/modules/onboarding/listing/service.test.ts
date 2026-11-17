import { describe, expect, it } from "vitest";
import type { PlaceCandidate } from "../places";
import { listingChoices, listingQuery, MAX_LISTING_CHOICES } from "./service";

const place = (id: string, name: string | null, address: string | null = null): PlaceCandidate => ({
  placeId: id,
  name,
  address,
  phone: "555 0100",
  primaryType: "cafe",
  types: ["cafe"],
  websiteUri: "https://example.com",
  city: "Austin",
  state: "TX",
  country: "US",
  area: null,
});

describe("Link Google listing (owner, 2026-11-17)", () => {
  it("searches the name with the business's city", () => {
    expect(listingQuery(" Bean House ", "Austin")).toBe("Bean House Austin");
    expect(listingQuery("Bean House", null)).toBe("Bean House");
  });

  it("offers Google's matches in its order, only id, name and address, at most five", () => {
    const found = [place("ChIJ-one-000", "Bean House", "1 Main St"), place("ChIJ-two-000", null), ...Array.from({ length: 6 }, (_, i) => place(`ChIJ-more-${i}00`, `Bean ${i}`))];
    const choices = listingChoices(found);
    expect(choices).toHaveLength(MAX_LISTING_CHOICES);
    expect(choices[0]).toEqual({ placeId: "ChIJ-one-000", name: "Bean House", address: "1 Main St" });
    // Nothing else from Google rides along to the page (D-73).
    expect(Object.keys(choices[1]).sort()).toEqual(["address", "name", "placeId"]);
  });
});
