import { describe, expect, it } from "vitest";
import { autofill, MAX_PLACE_CHOICES } from "./autofill";
import { BLOCKED_PAGES, COFFEE_PLACE, OTHER_PLACE, fakeClients } from "./fixtures";
import { PlacesError } from "./places";
import { EMPTY_DETAILS, NOTES, unreadableNote } from "./service";

// The top Google result by name and city used to be adopted silently, even when it was another business.
describe("autofill without a website (MVP_SPEC 3.3)", () => {
  const typed = { ...EMPTY_DETAILS, name: "Sunrise Coffee", city: "Springfield" };

  it("offers the Google listings as choices and adopts none of them: no place_id, the typed name and city stay", async () => {
    const { clients, calls } = fakeClients({ places: { "Sunrise Coffee Springfield": [OTHER_PLACE, COFFEE_PLACE] } });
    const run = await autofill({ name: "Sunrise Coffee", city: "Springfield" }, clients);

    expect(run.placeId).toBeNull();
    expect(run.result.details).toEqual(typed);
    expect(run.result.filledFrom).toEqual({ website: false, google: false });
    expect(run.result.note).toBe(NOTES.noneChosen);
    // In Google's order, top result first, but not picked for the user.
    expect(run.result.choices?.map((c) => [c.placeId, c.name, c.address])).toEqual([
      [OTHER_PLACE.placeId, OTHER_PLACE.name, OTHER_PLACE.address],
      [COFFEE_PLACE.placeId, COFFEE_PLACE.name, COFFEE_PLACE.address],
    ]);
    expect(calls).toMatchObject({ places: ["Sunrise Coffee Springfield"], scrape: [], extract: [] });
  });

  it("fills the form from a listing only once it is picked", async () => {
    const { clients } = fakeClients({ places: { "Sunrise Coffee Springfield": [COFFEE_PLACE] } });
    const [choice] = (await autofill({ name: "Sunrise Coffee", city: "Springfield" }, clients)).result.choices ?? [];
    expect(choice.autofill).toEqual({
      details: { ...typed, name: COFFEE_PLACE.name, industry: "coffee_shop", state: "IL", country: "US", area: "Downtown", phone: COFFEE_PLACE.phone, address: COFFEE_PLACE.address },
      filledFrom: { website: false, google: true },
      note: null,
    });
    expect(choice.autofill.choices).toBeUndefined();
  });

  it("keeps the typed city for a listing that has none, skips listings with no name, and offers at most 5", async () => {
    const noCity = { ...COFFEE_PLACE, placeId: "ChIJ-fixture-no-city", address: null, city: null, state: null, country: null };
    const many = Array.from({ length: 7 }, (_, i) => ({ ...COFFEE_PLACE, placeId: `ChIJ-fixture-many-${i}` }));
    const { clients } = fakeClients({ places: { "Sunrise Coffee Springfield": [{ ...COFFEE_PLACE, name: null }, noCity, ...many] } });
    const { choices } = (await autofill({ name: "Sunrise Coffee", city: "Springfield" }, clients)).result;
    expect(choices).toHaveLength(MAX_PLACE_CHOICES);
    expect(choices?.[0]).toMatchObject({ placeId: noCity.placeId, address: null });
    expect(choices?.[0].autofill.details.city).toBe("Springfield");
  });

  it("keeps what the user typed, with no choices, when Places finds nothing or fails", async () => {
    for (const [places, note] of [[undefined, NOTES.nothingFound], [new Error("403"), NOTES.unavailable]] as const) {
      const { clients } = fakeClients({ places });
      const run = await autofill({ name: "Sunrise Coffee", city: "Springfield" }, clients);
      expect(run.result.details).toEqual(typed);
      // Nothing found says so; Google failing says auto-fill is unavailable (2026-10-14).
      expect(run.result.note).toBe(note);
      expect(run.result.choices).toBeUndefined();
      expect(run.placeId).toBeNull();
    }
  });
});

describe("a source that refused, not a business that was not found (2026-10-14)", () => {
  it("says auto-fill is unavailable when Google refused, keeping what was typed", async () => {
    const { clients } = fakeClients({ places: new PlacesError("Places returned 429") });
    const run = await autofill({ name: "Sunrise Coffee", city: "Springfield" }, clients);
    expect(run.result.note).toBe(NOTES.unavailable);
    expect(run.result.details).toMatchObject({ name: "Sunrise Coffee", city: "Springfield" });
    expect(run.problems).toEqual([{ provider: "google_places", message: 'Search for "Sunrise Coffee Springfield" failed: Places returned 429' }]);
  });

  it("says auto-fill is unavailable when Firecrawl itself refused, not that the website blocked us", async () => {
    const refused = BLOCKED_PAGES.map((p) => ({ ...p, status: "failed" as const, readerDown: true }));
    const { clients } = fakeClients({ pages: refused });
    const run = await autofill({ domain: "sunrise-coffee.example" }, clients);
    expect(run.result.note).toBe(NOTES.unavailable);
    // A site that blocks readers still reads as before.
    const blocked = await autofill({ domain: "sunrise-coffee.example" }, fakeClients({ pages: BLOCKED_PAGES }).clients);
    expect(blocked.result.note).toBe(unreadableNote("sunrise-coffee.example", true, "fill"));
  });
});

