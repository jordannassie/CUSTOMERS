import { describe, expect, it, vi } from "vitest";
import { autofill } from "./autofill";
import { brandGuesses, spacedBrand } from "./autofill-fallback";
import { BLOCKED_PAGES, COFFEE_DOMAIN, COFFEE_PAGES, COFFEE_PLACE, fakeClients } from "./fixtures";
import { createPlacesSearch, PLACES_TEXT_SEARCH_URL, type PlaceCandidate } from "./places";
import { AUTOFILL_MODEL } from "./prompts/business-autofill.v1";
import { NOTES, unreadableNote } from "./service";

// 2026-10-16, bennucoffee.com: the site blocked every page and Google said "fetch failed", and the form said only
// "Auto-fill is temporarily unavailable". Now: a retry, the brand search, a listing to pick, and the real reason.
const BENNU = "bennucoffee.com";
const listing = (placeId: string, name: string, websiteUri: string | null): PlaceCandidate => ({
  ...COFFEE_PLACE,
  placeId,
  name,
  websiteUri,
  city: "Austin",
  state: "TX",
  address: `${name}, Austin, TX`,
});

describe("a website that blocks automated readers", () => {
  it("searches the brand the domain spells, spaced, and offers Google's listings to pick", async () => {
    expect(spacedBrand("bennucoffee")).toBe("bennu coffee");
    expect(brandGuesses(BENNU)).toEqual(["bennu coffee", "bennucoffee"]);

    const found = [listing("ChIJbennu-congress", "Bennu Coffee", null), listing("ChIJbennu-mlk", "Bennu Coffee MLK", null)];
    const { clients, calls } = fakeClients({ pages: BLOCKED_PAGES, places: { "bennu coffee": found } });
    const run = await autofill({ domain: BENNU }, clients);

    expect(calls.places).toEqual([BENNU, "bennu coffee", "bennucoffee"]);
    expect(calls.extract).toEqual([]);
    expect(run.placeId).toBeNull();
    expect(run.result.choices?.map((c) => c.name)).toEqual(["Bennu Coffee", "Bennu Coffee MLK"]);
    expect(run.result.choices?.[0].autofill.details).toMatchObject({ name: "Bennu Coffee", city: "Austin", state: "TX" });
    expect(run.result.pickNote).toBe(
      "We couldn't read bennucoffee.com because it blocks automated readers. Pick your Google listing or fill in the details below.",
    );
    // After "None of these", the form is left to fill in, without the pick wording.
    expect(run.result.note).toBe("We couldn't read bennucoffee.com because it blocks automated readers. Please fill in the details below.");
    expect(run.result.retry).toBeUndefined();
  });

  it("fills straight from Google when a listing has this website", async () => {
    const own = listing("ChIJbennu-own", "Bennu Coffee", "https://bennucoffee.com/");
    const { clients } = fakeClients({ pages: BLOCKED_PAGES, places: { [BENNU]: [own] } });
    const run = await autofill({ domain: BENNU }, clients);
    expect(run.placeId).toBe("ChIJbennu-own");
    expect(run.result.choices).toBeUndefined();
    expect(run.result.note).toBe(unreadableNote(BENNU, true, "google"));
  });

  it("says both failed, with Try again, when Google can't be reached either", async () => {
    const { clients } = fakeClients({ pages: BLOCKED_PAGES, places: new Error("fetch failed") });
    const run = await autofill({ domain: BENNU }, clients);
    expect(run.result.note).toBe("We couldn't read your website or find it on Google right now. Fill in the details below, or try again in a minute.");
    expect(run.result.retry).toBe(true);
    expect(run.result.choices).toBeUndefined();
    expect(run.result.note).not.toBe(NOTES.unavailable);
  });

  it("keeps \"temporarily unavailable\" for our own AI outage only", async () => {
    const { clients } = fakeClients({ pages: COFFEE_PAGES, outputs: { [AUTOFILL_MODEL]: new Error("Claude and the backup are down") } });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    // The page title still names the business, so it is the "filled in what we could" form of the same note.
    expect([NOTES.unavailable, NOTES.unavailablePartly]).toContain(run.result.note);
    expect(run.result.retry).toBeUndefined();
  });
});

describe("Google Places search", () => {
  const ok = () => new Response(JSON.stringify({ places: [] }), { status: 200, headers: { "Content-Type": "application/json" } });

  it("tries once more after a network error or timeout", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(ok());
    expect(await createPlacesSearch("gp-test", { fetch, retryDelayMs: 1 })("bennucoffee.com")).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe(PLACES_TEXT_SEARCH_URL);
  });

  it("gives up after the second failure, so auto-fill can say Google could not be reached", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("fetch failed"));
    await expect(createPlacesSearch("gp-test", { fetch, retryDelayMs: 1 })("bennucoffee.com")).rejects.toThrow("fetch failed");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
