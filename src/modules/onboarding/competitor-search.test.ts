import { describe, expect, it, vi } from "vitest";
import { fakeCompetitorPlaces, OWN_CANDIDATE } from "./competitor-fixtures";
import { COMPETITOR_TIMEOUT_MS, createCompetitorPlaces, NEARBY_RADIUS_M, ORIGIN_FIELD_MASK, searchBody } from "./competitor-places";
import { discoverCompetitors, type BusinessForSearch } from "./competitors";

// Competitor suggestions near the business and of its own Google type (BUG-085), with a short timeout (BUG-088).
const COFFEE: BusinessForSearch = {
  name: OWN_CANDIDATE.name,
  industry: "coffee_shop",
  services: ["oat milk lattes"],
  city: "Springfield",
  region: "IL",
  placesId: OWN_CANDIDATE.placeId,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("searching near the business (BUG-085)", () => {
  const origin = { latitude: 33.6844, longitude: 73.0479, primaryType: "clothing_store" };

  it("biases to a circle around the business and keeps its own Google type", () => {
    expect(searchBody("Sportswear store in Islamabad", 11, origin, true)).toEqual({
      textQuery: "Sportswear store in Islamabad",
      pageSize: 11,
      locationBias: { circle: { center: { latitude: 33.6844, longitude: 73.0479 }, radius: NEARBY_RADIUS_M } },
      includedType: "clothing_store",
    });
    expect(searchBody("Blue Door in Islamabad", 5, origin, false)).not.toHaveProperty("includedType");
    expect(searchBody("coffee shop in Springfield, IL", 11, null, true)).toEqual({ textQuery: "coffee shop in Springfield, IL", pageSize: 11 });
  });

  it("reads the business's place live, searches again without a type Google refuses, and times out in 8 seconds", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ location: { latitude: 33.6844, longitude: 73.0479 }, primaryType: "clothing_store" }))
      .mockResolvedValueOnce(json({ error: { code: 400 } }, 400))
      .mockResolvedValueOnce(json({ places: [{ id: "ChIJ-fixture-outfitters", displayName: { text: "Outfitters" } }] }));
    const places = createCompetitorPlaces("places-test", { fetch });
    const near = await places.origin!("ChIJ-fixture-own");
    expect(near).toEqual(origin);
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({ "X-Goog-FieldMask": ORIGIN_FIELD_MASK });
    const found = await places.search("Sportswear store in Islamabad", 11, near, true);
    expect(found.map((c) => c.name)).toEqual(["Outfitters"]);
    expect(JSON.parse(String(fetch.mock.calls[2][1]?.body))).not.toHaveProperty("includedType");
    expect(COMPETITOR_TIMEOUT_MS).toBe(8_000);
  });

  it("uses the business's place for suggestions, and still searches when Google has no place for it", async () => {
    const { places, calls } = fakeCompetitorPlaces();
    const seen: unknown[] = [];
    places.origin = async () => origin;
    const search = places.search;
    places.search = async (q, n, near, sameType) => {
      seen.push({ near, sameType });
      return search(q, n);
    };
    await discoverCompetitors(COFFEE, places);
    expect(seen).toEqual([{ near: origin, sameType: true }]);
    places.origin = async () => {
      throw new Error("down");
    };
    await discoverCompetitors(COFFEE, places);
    expect(calls.search).toHaveLength(2);
  });
});
