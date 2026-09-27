// B-35 rules and the Places client, with hand-built fixtures; fetch is mocked, nothing goes out.
import { describe, expect, it, vi } from "vitest";
import { fakeCompetitorPlaces, LOOKUP_CANDIDATES, NEARBY_CANDIDATES, OWN_CANDIDATE } from "./competitor-fixtures";
import {
  COMPETITOR_DETAILS_FIELD_MASK,
  COMPETITOR_SEARCH_FIELD_MASK,
  createCompetitorPlaces,
  PLACES_DETAILS_URL,
} from "./competitor-places";
import {
  COMPETITOR_NOTES,
  MAX_SUGGESTIONS,
  competitorFields,
  dedupeConfirmed,
  discoverCompetitors,
  limitMessage,
  lookupQuery,
  nearbyQuery,
  planSave,
  type BusinessForSearch,
} from "./competitors";
import { PLACES_TEXT_SEARCH_URL, PlacesError } from "./places";

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

describe("search queries", () => {
  it("searches the industry near the business, falling back to the first service for other", () => {
    expect(nearbyQuery(COFFEE)).toBe("coffee shop in Springfield, IL");
    expect(nearbyQuery({ ...COFFEE, industry: "hvac" })).toBe("HVAC contractor in Springfield, IL");
    expect(nearbyQuery({ ...COFFEE, industry: "other", services: ["dog grooming"] })).toBe("dog grooming in Springfield, IL");
    expect(nearbyQuery({ ...COFFEE, industry: "other", services: [] })).toBeNull();
    expect(nearbyQuery({ ...COFFEE, city: null })).toBeNull();
    expect(lookupQuery(" Blue Door ", COFFEE)).toBe("Blue Door in Springfield, IL");
    expect(lookupQuery("Blue Door", { ...COFFEE, city: null, region: null })).toBe("Blue Door");
  });
});

describe("discoverCompetitors", () => {
  it("returns up to 10 nearby places without the business itself", async () => {
    const { places, calls } = fakeCompetitorPlaces();
    const { suggestions, note } = await discoverCompetitors(COFFEE, places);

    expect(calls.search).toEqual(["coffee shop in Springfield, IL"]);
    expect(suggestions).toHaveLength(MAX_SUGGESTIONS);
    expect(suggestions.map((s) => s.placeId)).not.toContain(OWN_CANDIDATE.placeId);
    expect(suggestions[0]).toMatchObject({ name: "Bean House", rating: 4.7, reviewCount: 320 });
    expect(note).toBeNull();
  });

  it("drops the business by name too when it has no place id yet", async () => {
    const { places } = fakeCompetitorPlaces();
    const { suggestions } = await discoverCompetitors({ ...COFFEE, placesId: null, name: "sunrise coffee bar" }, places);
    expect(suggestions.map((s) => s.name)).not.toContain(OWN_CANDIDATE.name);
  });

  it("explains instead of failing when there is no city, no category, or Places is down", async () => {
    const { places, calls } = fakeCompetitorPlaces();
    expect(await discoverCompetitors({ ...COFFEE, city: "" }, places)).toEqual({ suggestions: [], note: COMPETITOR_NOTES.noLocation });
    expect(await discoverCompetitors({ ...COFFEE, industry: null, services: [] }, places)).toEqual({
      suggestions: [],
      note: COMPETITOR_NOTES.noCategory,
    });
    expect(calls.search).toEqual([]);

    const down = fakeCompetitorPlaces(new PlacesError("Places returned 503"));
    expect(await discoverCompetitors(COFFEE, down.places)).toEqual({ suggestions: [], note: COMPETITOR_NOTES.unavailable });
  });
});

describe("saving rules", () => {
  it("keeps one entry per name and per place", () => {
    expect(
      dedupeConfirmed([
        { name: " Bean House ", placesId: "ChIJ-fixture-bean-house" },
        { name: "bean house", placesId: null },
        { name: "Bean House Two", placesId: "ChIJ-fixture-bean-house" },
        { name: "  ", placesId: null },
        { name: "Blue Door", placesId: null },
      ]),
    ).toEqual([
      { name: "Bean House", placesId: "ChIJ-fixture-bean-house" },
      { name: "Blue Door", placesId: null },
    ]);
  });

  it("keeps rows the user left in, removes the rest and adds new ones", () => {
    const existing = [
      { id: "a", name: "Bean House" },
      { id: "b", name: "Old Rival" },
    ];
    const plan = planSave(existing, [
      { name: "bean house", placesId: "ChIJ-fixture-bean-house" },
      { name: "Blue Door", placesId: null },
    ]);
    expect(plan).toEqual({
      remove: ["b"],
      keep: [{ id: "a", competitor: { name: "bean house", placesId: "ChIJ-fixture-bean-house" } }],
      add: [{ name: "Blue Door", placesId: null }],
    });
  });

  it("writes only the user's name and the place id (D-73)", () => {
    expect(competitorFields({ name: "Bean House", placesId: "ChIJ-fixture-bean-house" })).toEqual({
      name: "Bean House",
      places_id: "ChIJ-fixture-bean-house",
      source: "confirmed_place",
      confirmed: true,
    });
    expect(competitorFields({ name: "Blue Door", placesId: null }).source).toBe("manual");
  });

  it("words the plan limit the way the task asks", () => {
    expect(limitMessage(5)).toBe("Your plan tracks up to 5 competitors.");
  });
});

describe("Places competitor client", () => {
  it("searches with only the display fields and reads rating and review count", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({
        places: [
          {
            id: "ChIJ-fixture-bean-house",
            displayName: { text: "Bean House" },
            rating: 4.7,
            userRatingCount: 320,
            shortFormattedAddress: "88 Oak Ave, Springfield",
            googleMapsUri: "https://maps.google.com/?cid=1",
          },
          { id: "ChIJ-fixture-no-name", displayName: { text: "" } },
        ],
      }),
    );
    const found = await createCompetitorPlaces("places-test", { fetch }).search("coffee shop in Springfield, IL", 11);

    expect(found).toEqual([
      {
        placeId: "ChIJ-fixture-bean-house",
        name: "Bean House",
        rating: 4.7,
        reviewCount: 320,
        address: "88 Oak Ave, Springfield",
        mapsUri: "https://maps.google.com/?cid=1",
      },
    ]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(PLACES_TEXT_SEARCH_URL);
    const headers = new Headers(init?.headers);
    expect(headers.get("x-goog-api-key")).toBe("places-test");
    expect(headers.get("x-goog-fieldmask")).toBe(COMPETITOR_SEARCH_FIELD_MASK);
    expect(COMPETITOR_SEARCH_FIELD_MASK).not.toContain("*");
    expect(JSON.parse(String(init?.body))).toEqual({ textQuery: "coffee shop in Springfield, IL", pageSize: 11 });
  });

  it("looks up one saved place by id, and treats bad ids and 404s as gone", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ id: "ChIJ-fixture-bean-house", displayName: { text: "Bean House" }, rating: 4.7 }))
      .mockResolvedValueOnce(json({ error: { code: 404 } }, 404))
      .mockResolvedValueOnce(json({ error: { code: 403 } }, 403));
    const places = createCompetitorPlaces("places-test", { fetch });

    expect(await places.details("ChIJ-fixture-bean-house")).toMatchObject({ name: "Bean House", rating: 4.7, reviewCount: null });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${PLACES_DETAILS_URL}/ChIJ-fixture-bean-house`);
    expect(new Headers(init?.headers).get("x-goog-fieldmask")).toBe(COMPETITOR_DETAILS_FIELD_MASK);

    expect(await places.details("ChIJ-fixture-closed")).toBeNull();
    await expect(places.details("ChIJ-fixture-denied")).rejects.toBeInstanceOf(PlacesError);
    expect(await places.details("../../evil")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("fixture Places", () => {
  it("answers category searches with the nearby list and names with lookups", async () => {
    const { places } = fakeCompetitorPlaces();
    expect(await places.search("plumber in Springfield, IL", 3)).toEqual(NEARBY_CANDIDATES.slice(0, 3));
    expect(await places.search("Blue Door in Springfield, IL", 5)).toEqual(LOOKUP_CANDIDATES);
    expect(await places.search("Nowhere Diner in Springfield, IL", 5)).toEqual([]);
  });
});
