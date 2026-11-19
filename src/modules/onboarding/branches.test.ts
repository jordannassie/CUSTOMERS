import { describe, expect, it } from "vitest";
import { distanceM, FAR_M, forDisplay, nearestBranches, sameChain, SAME_AREA_M, withDistance } from "./branches";
import type { CompetitorCandidate } from "./competitor-places";
import { matchingPlace } from "./competitors";

// The business: Saddar, Rawalpindi. 0.01 degree of latitude is about 1.1 km.
const HOME = { latitude: 33.6, longitude: 73.05, primaryType: "pizza_restaurant" };
const at = (km: number) => ({ latitude: HOME.latitude + km / 111.2, longitude: HOME.longitude });
const place = (id: string, name: string, km: number | null, website: string | null = null): CompetitorCandidate => ({
  placeId: id,
  name,
  rating: 4,
  reviewCount: 10,
  address: null,
  mapsUri: null,
  ...(km === null ? {} : { location: at(km) }),
  ...(website ? { website } : {}),
});

describe("distanceM", () => {
  it("measures meters between two points", () => {
    expect(distanceM(HOME, at(1))).toBeGreaterThan(990);
    expect(distanceM(HOME, at(1))).toBeLessThan(1010);
  });
});

describe("sameChain", () => {
  it("joins branches by their website or by their name", () => {
    expect(sameChain(place("a", "Domino's Pizza Saddar", 1), place("b", "Domino's Pizza Chaklala-III", 5))).toBe(true);
    expect(sameChain(place("a", "Pizza Hut", 1), place("b", "Pizza Hut Bahria Town", 9))).toBe(true);
    expect(sameChain(place("a", "KFC Saddar", 1, "https://kfcpakistan.com"), place("b", "KFC Bahria", 9, "https://www.kfcpakistan.com/"))).toBe(true);
    expect(sameChain(place("a", "Pizza Hut Saddar", 1, "https://www.pizzahutpk.com/"), place("b", "PH Delivery", 4, "https://pizzahutpk.com/order"))).toBe(true);
  });

  it("keeps different businesses apart", () => {
    expect(sameChain(place("a", "Pizza Hut", 1), place("b", "Pizza Point", 1))).toBe(false);
    // One shared word is not a chain.
    expect(sameChain(place("a", "Canopy", 1), place("b", "Canopy Tree Service", 1))).toBe(false);
    // Different websites are different businesses, whatever the names.
    expect(sameChain(place("a", "Pizza Hut Saddar", 1, "https://pizzahut.pk"), place("b", "Pizza Hut Express", 1, "https://phexpress.pk"))).toBe(false);
    // A shared site (Facebook) proves nothing.
    expect(sameChain(place("a", "Cheezious", 1, "https://facebook.com/cheezious"), place("b", "Bhai Pizza", 1, "https://facebook.com/bhai"))).toBe(false);
  });
});

describe("nearestBranches", () => {
  const found = withDistance(
    [
      place("far", "Domino's Pizza Islamabad F-7", 15),
      place("near", "Domino's Pizza Saddar", 0.8),
      place("next", "Domino's Pizza Committee Chowk", 2.4),
      place("mid", "Domino's Pizza Chaklala-III", 6),
      place("other", "Cheezious Saddar", 1.5),
      place("away", "Pizza Point Lahore", 270),
    ],
    HOME,
  );
  const kept = nearestBranches(found).map((c) => c.placeId);

  it("keeps the nearest branch of a chain and any other in the same neighbourhood", () => {
    expect(kept).toContain("near");
    expect(kept).toContain("next");
    expect(kept).not.toContain("mid");
    expect(kept).not.toContain("far");
  });

  it("never offers a business from another area, and keeps other businesses", () => {
    expect(kept).not.toContain("away");
    expect(kept).toContain("other");
    expect(SAME_AREA_M).toBeLessThan(FAR_M);
  });

  it("with no location known, keeps the first branch Google returned", () => {
    const kept2 = nearestBranches([place("1", "Domino's Pizza Saddar", null), place("2", "Domino's Pizza Bahria", null), place("3", "Cheezious", null)]);
    expect(kept2.map((c) => c.placeId)).toEqual(["1", "3"]);
  });

  it("sends no location or website to the screen", () => {
    const [shown] = forDisplay(found);
    expect(shown).not.toHaveProperty("location");
    expect(shown).not.toHaveProperty("website");
    expect(shown.distanceM).toBeGreaterThan(0);
  });
});

// 2026-10-27: an AI-named chain gets its nearest branch, never one from another area.
describe("matchingPlace for chains", () => {
  const branch = (name: string, placeId: string, distanceM: number) => ({ placeId, name, rating: null, reviewCount: null, address: null, mapsUri: null, distanceM });
  it("picks the nearest branch of the chain AI named", () => {
    const found = [branch("Domino's Pizza Chaklala", "far", 6000), branch("Domino's Pizza Saddar", "near", 800)];
    expect(matchingPlace("Domino's Pizza", found)?.placeId).toBe("near");
  });

  it("never picks a branch from another area", () => {
    expect(matchingPlace("Domino's Pizza", [branch("Domino's Pizza Lahore", "lahore", 270_000)])).toBeNull();
  });
});

