import { describe, expect, it } from "vitest";
import type { PlaceCandidate } from "../places";
import { findListing, needsListing } from "./listing";

const listing = (placeId: string, websiteUri: string | null, city: string): PlaceCandidate => ({
  placeId,
  name: "Advanced Plumbing",
  address: null,
  phone: null,
  primaryType: "plumber",
  types: ["plumber"],
  websiteUri,
  city,
  state: "CA",
  country: "US",
  area: null,
});

// BUG-158: no place_id was saved at setup because Google was over its daily limit.
describe("looking for a missed Google listing again", () => {
  it("is for a business with a website, no listing and not a chain", () => {
    const b = { domain: "advancedplumbing.example", hasWebsite: true, placesId: null, chain: false };
    expect(needsListing(b)).toBe(true);
    expect(needsListing({ ...b, placesId: "ChIJ-already-linked" })).toBe(false);
    expect(needsListing({ ...b, chain: true })).toBe(false);
    expect(needsListing({ ...b, hasWebsite: false })).toBe(false);
    expect(needsListing({ ...b, domain: null })).toBe(false);
  });

  it("takes the listing whose website is the business's, else nothing", async () => {
    const queries: string[] = [];
    const search = async (q: string) => {
      queries.push(q);
      return [listing("ChIJ-other", "https://someone-else.example", "Orange"), listing("ChIJ-ours", "https://www.advancedplumbing.example/", "Orange")];
    };
    expect(await findListing("advancedplumbing.example", search)).toEqual({ placesId: "ChIJ-ours" });
    expect(queries).toEqual(["advancedplumbing.example"]);
    expect(await findListing("advancedplumbing.example", async () => [listing("ChIJ-other", "https://someone-else.example", "Orange")])).toBeNull();
  });

  it("calls the site a chain when it is listed in several cities, and keeps no listing", async () => {
    const search = async () => [listing("ChIJ-a", "https://advancedplumbing.example", "Orange"), listing("ChIJ-b", "https://advancedplumbing.example", "Irvine")];
    expect(await findListing("advancedplumbing.example", search)).toEqual({ chain: true });
  });
});
