import { describe, expect, it, vi } from "vitest";
import { AUSTIN_CANDIDATE, DALLAS_CANDIDATE, fixtureArea, NEARBY_CANDIDATES } from "../competitor-fixtures";
import { AREA_FIELD_MASK, createCompetitorPlaces, toPlaceArea } from "../competitor-places";
import { PlacesError } from "../places";
import { checkNearNote, isOutside, locationChange, needsNearCheck, oldPlaceName, placeKey, removedNote } from "./service";

// Competitors follow the business's location (2026-10-16): the comparison, Google's address parts and the notes.
const AUSTIN = { city: "Austin", region: "TX", country: "US" };
const DALLAS = { city: "Dallas", region: "TX", country: "US" };

describe("comparing a competitor's place with the business's new one", () => {
  it("removes an Austin pick and keeps a Dallas one when the business moves from Austin to Dallas", () => {
    const change = locationChange(AUSTIN, DALLAS);
    expect(change).toEqual({ city: true, region: false, country: false });
    expect(isOutside(fixtureArea(AUSTIN_CANDIDATE), DALLAS, change)).toBe(true);
    expect(isOutside(fixtureArea(DALLAS_CANDIDATE), DALLAS, change)).toBe(false);
  });

  it("matches names as people type them: case, accents, punctuation and St. or Saint", () => {
    expect(placeKey("St. Louis")).toBe(placeKey("saint louis"));
    expect(placeKey("Ft Worth")).toBe(placeKey("Fort Worth"));
    expect(placeKey("Montréal")).toBe(placeKey("montreal"));
    expect(placeKey("Stamford")).not.toBe(placeKey("Saintamford"));
    expect(locationChange(AUSTIN, { city: " austin ", region: "tx", country: "us" })).toEqual({ city: false, region: false, country: false });
  });

  it("compares only what changed, so fixing TX to Texas keeps a competitor in the next town", () => {
    const roundRock = { cities: ["Round Rock"], regions: ["Texas", "TX"], country: "US" };
    const fixed = { ...AUSTIN, region: "Texas" };
    expect(isOutside(roundRock, fixed, locationChange(AUSTIN, fixed))).toBe(false);
    // Same city name, another state: the region decides.
    const illinois = { cities: ["Springfield"], regions: ["Illinois", "IL"], country: "US" };
    const missouri = { city: "Springfield", region: "MO", country: "US" };
    expect(isOutside(illinois, missouri, locationChange({ city: "Springfield", region: "IL", country: "US" }, missouri))).toBe(true);
    // Another country.
    const toronto = { city: "Toronto", region: "ON", country: "CA" };
    expect(isOutside({ cities: [], regions: ["Texas", "TX"], country: "US" }, toronto, locationChange(AUSTIN, toronto))).toBe(true);
  });

  it("never removes on what Google does not say", () => {
    const change = locationChange(AUSTIN, DALLAS);
    expect(isOutside({ cities: [], regions: [], country: null }, DALLAS, change)).toBe(false);
    // A cleared city removes nothing for the city.
    expect(isOutside(fixtureArea(AUSTIN_CANDIDATE), { ...AUSTIN, city: null }, locationChange(AUSTIN, { ...AUSTIN, city: null }))).toBe(false);
  });

  it("matches a borough or town Google gives besides the city", () => {
    const brooklyn = { cities: ["New York", "Brooklyn"], regions: ["New York", "NY"], country: "US" };
    const now = { city: "Brooklyn", region: "NY", country: "US" };
    expect(isOutside(brooklyn, now, locationChange({ city: "Queens", region: "NY", country: "US" }, now))).toBe(false);
  });
});

describe("Google's address parts (read live, never stored)", () => {
  it("reads city, region and country from addressComponents with one Essentials field", async () => {
    const body = {
      addressComponents: [
        { longText: "2500", shortText: "2500", types: ["street_number"] },
        { longText: "Dallas", shortText: "Dallas", types: ["locality", "political"] },
        { longText: "Dallas County", shortText: "Dallas County", types: ["administrative_area_level_2", "political"] },
        { longText: "Texas", shortText: "TX", types: ["administrative_area_level_1", "political"] },
        { longText: "United States", shortText: "US", types: ["country", "political"] },
      ],
    };
    expect(toPlaceArea(body)).toEqual({ cities: ["Dallas"], regions: ["Texas", "TX"], country: "US" });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(new Response("{}", { status: 403 }));
    const places = createCompetitorPlaces("places-test", { fetch, retryDelayMs: 0 });
    expect(await places.area!("ChIJ-fixture-dallas-roast")).toEqual({ cities: ["Dallas"], regions: ["Texas", "TX"], country: "US" });
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({ "X-Goog-FieldMask": AREA_FIELD_MASK });
    expect(await places.area!("ChIJ-fixture-gone-place")).toBeNull();
    await expect(places.area!("ChIJ-fixture-refused")).rejects.toBeInstanceOf(PlacesError);
    expect(await places.area!("not a place id")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("fixture places are in Springfield, IL unless they say otherwise", () => {
    expect(fixtureArea(NEARBY_CANDIDATES[0])).toEqual({ cities: ["Springfield"], regions: ["Illinois", "IL"], country: "US" });
    expect(fixtureArea(AUSTIN_CANDIDATE).cities).toEqual(["Austin"]);
  });
});

describe("the notes on the competitor list", () => {
  it("says how many were removed and from where", () => {
    expect(removedNote(1, ["Austin"], "Dallas")).toBe("We removed 1 competitor from Austin. The suggestions below are near Dallas.");
    expect(removedNote(3, ["Austin", "Dallas"], "Houston")).toBe("We removed 3 competitors from Austin and Dallas. The suggestions below are near Houston.");
    expect(removedNote(2, [], null)).toBe("We removed 2 competitors that are not near your business.");
    expect(oldPlaceName(AUSTIN)).toBe("Austin");
    expect(oldPlaceName({ city: " ", region: "TX", country: "US" })).toBe("TX");
  });

  it("flags a competitor added by name before the move, not one added after or one from Google", () => {
    const moved = "2026-10-16T10:00:00.000Z";
    expect(needsNearCheck({ placesId: null, createdAt: "2026-10-16T09:00:00.000Z" }, moved)).toBe(true);
    expect(needsNearCheck({ placesId: null, createdAt: "2026-10-16T11:00:00.000Z" }, moved)).toBe(false);
    expect(needsNearCheck({ placesId: "ChIJ-fixture-dallas-roast", createdAt: "2026-10-16T09:00:00.000Z" }, moved)).toBe(false);
    expect(needsNearCheck({ placesId: null, createdAt: "2026-10-16T09:00:00.000Z" }, null)).toBe(false);
    expect(checkNearNote("Dallas")).toBe("Added by name: check it is near Dallas");
  });
});

describe("no long dashes in the notes", () => {
  it("follows the writing guide", () => {
    for (const text of [removedNote(2, ["Austin"], "Dallas"), checkNearNote("Dallas")]) expect(text).not.toMatch(/[–—]/);
  });
});
