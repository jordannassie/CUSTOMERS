import { describe, expect, it } from "vitest";
import { autofill } from "./autofill";
import {
  BLOCKED_DOMAIN,
  BLOCKED_PAGES,
  BLOCKED_PLACE,
  COFFEE_DOMAIN,
  COFFEE_PAGES,
  COFFEE_PLACE,
  COFFEE_SITE_OUTPUT,
  OTHER_PLACE,
  fakeClients,
} from "./fixtures";
import { AUTOFILL_MODEL, AUTOFILL_PROMPT_VERSION, AUTOFILL_RETRY_MODEL } from "./prompts/business-autofill.v1";
import { EMPTY_DETAILS, NOTES } from "./service";

describe("autofill with a website", () => {
  it("combines the site and Places: Places wins name, address, phone and category; the site wins description and services", async () => {
    const { clients, calls } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [OTHER_PLACE, COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);

    expect(run.result.details).toEqual({
      name: "Sunrise Coffee Bar & Roastery",
      industry: "coffee_shop",
      description: COFFEE_SITE_OUTPUT.description,
      services: COFFEE_SITE_OUTPUT.services,
      city: "Springfield",
      state: "IL",
      country: "US",
      area: "Downtown",
      phone: "(217) 555-0142",
      address: "120 Main St, Springfield, IL 62701, USA",
    });
    expect(run.result).toMatchObject({ filledFrom: { website: true, google: true }, note: null });
    expect(run.placeId).toBe(COFFEE_PLACE.placeId);
    expect(calls).toEqual({ scrape: [COFFEE_DOMAIN], places: [COFFEE_DOMAIN], extract: [AUTOFILL_MODEL] });
  });

  it("keeps Places values out of the stored site facts (D-73)", async () => {
    const { clients } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const { siteFacts } = await autofill({ domain: COFFEE_DOMAIN }, clients);

    expect(siteFacts).toMatchObject({ promptVersion: AUTOFILL_PROMPT_VERSION, model: AUTOFILL_MODEL, domain: COFFEE_DOMAIN });
    expect(siteFacts?.facts).toEqual(COFFEE_SITE_OUTPUT);
    const stored = JSON.stringify(siteFacts);
    for (const placesOnly of [COFFEE_PLACE.placeId, COFFEE_PLACE.name!, COFFEE_PLACE.address!]) {
      expect(stored).not.toContain(placesOnly);
    }
  });

  it("fills from Google when the site blocks scanners, without calling the model", async () => {
    const { clients, calls } = fakeClients({
      pages: BLOCKED_PAGES,
      places: { [BLOCKED_DOMAIN]: [BLOCKED_PLACE] },
    });
    const run = await autofill({ domain: BLOCKED_DOMAIN }, clients);

    expect(run.result.details).toMatchObject({
      name: "Example Digital Agency",
      phone: "(949) 555-0199",
      address: "500 Harbor Blvd, Costa Mesa, CA 92626, USA",
      city: "Costa Mesa",
      // Google's marketing_agency is none of our industries: "other", named the way Google does (BUG-123).
      industry: "other",
      industryText: "Marketing agency",
      description: "",
    });
    expect(run.result.note).toBe(NOTES.googleOnly);
    expect(run.placeId).toBe(BLOCKED_PLACE.placeId);
    // Kept, so advice knows the site blocked us rather than that there is no site (BUG-087).
    expect(run.siteFacts).toMatchObject({ model: null, facts: null });
    expect(run.siteFacts?.pages.some((p) => p.status === "blocked")).toBe(true);
    expect(calls.extract).toEqual([]);
  });

  it("shows an empty form with a friendly note when nothing is found, even if every source throws", async () => {
    const { clients } = fakeClients({ pages: new Error("down"), places: new Error("403") });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    // Every source failed, so the note says auto-fill is unavailable, not that the business is unknown (D-84).
    expect(run).toMatchObject({
      result: { details: EMPTY_DETAILS, filledFrom: { website: false, google: false }, note: NOTES.unavailable },
      placeId: null,
      siteFacts: null,
    });
    // The reasons are kept for the server log and provider_errors (B7).
    expect(run.problems.map((p) => p.provider)).toEqual(expect.arrayContaining(["firecrawl", "google_places"]));
  });

  it("falls back to name plus city, and ignores listings for another website", async () => {
    const { clients, calls } = fakeClients({
      pages: COFFEE_PAGES,
      places: { "Sunrise Coffee Bar Springfield IL": [OTHER_PLACE, COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    expect(calls.places).toEqual([COFFEE_DOMAIN, "Sunrise Coffee Bar Springfield IL"]);
    expect(run.placeId).toBe(COFFEE_PLACE.placeId);

    const onlyOther = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [OTHER_PLACE], "Sunrise Coffee Bar Springfield IL": [OTHER_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const alone = await autofill({ domain: COFFEE_DOMAIN }, onlyOther.clients);
    expect(alone.placeId).toBeNull();
    expect(alone.result.details.name).toBe("Sunrise Coffee Bar");
    expect(alone.result.note).toBe(NOTES.websiteOnly);
  });

  it("retries once with Sonnet when confidence is low or the industry is empty", async () => {
    const weak = { ...COFFEE_SITE_OUTPUT, industry: "" as const, confidence: "low" as const };
    const { clients, calls } = fakeClients({
      pages: COFFEE_PAGES,
      outputs: { [AUTOFILL_MODEL]: weak, [AUTOFILL_RETRY_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    expect(calls.extract).toEqual([AUTOFILL_MODEL, AUTOFILL_RETRY_MODEL]);
    expect(run.result.details.industry).toBe("coffee_shop");
    expect(run.siteFacts?.model).toBe(AUTOFILL_RETRY_MODEL);
  });

  it("does not retry when Places supplies the name and category and confidence is high", async () => {
    const noIndustry = { ...COFFEE_SITE_OUTPUT, industry: "" as const };
    const { clients, calls } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: noIndustry },
    });
    await autofill({ domain: COFFEE_DOMAIN }, clients);
    expect(calls.extract).toEqual([AUTOFILL_MODEL]);
  });

  it("keeps the Haiku answer when the Sonnet retry fails, and still fills from Places when both fail", async () => {
    const low = { ...COFFEE_SITE_OUTPUT, confidence: "low" as const };
    const keep = fakeClients({
      pages: COFFEE_PAGES,
      outputs: { [AUTOFILL_MODEL]: low, [AUTOFILL_RETRY_MODEL]: new Error("529") },
    });
    const kept = await autofill({ domain: COFFEE_DOMAIN }, keep.clients);
    expect(kept.result.details.name).toBe("Sunrise Coffee Bar");
    expect(kept.siteFacts?.model).toBe(AUTOFILL_MODEL);

    const both = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: new Error("500") },
    });
    const placesOnly = await autofill({ domain: COFFEE_DOMAIN }, both.clients);
    expect(placesOnly.result.details.name).toBe(COFFEE_PLACE.name);
    // The site was readable; the AI was not (D-84). The old "didn't let us read it" note would be wrong here.
    expect(placesOnly.result.note).toBe(NOTES.unavailablePartly);
    expect(placesOnly.siteFacts).toBeNull();
  });

  it("drops a name, phone, city or address the pages do not contain", async () => {
    const invented = { ...COFFEE_SITE_OUTPUT, phone: "(217) 555-9999", address: "9 Elm St", city: "Chicago" };
    const { clients } = fakeClients({ pages: COFFEE_PAGES, outputs: { [AUTOFILL_MODEL]: invented } });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    expect(run.result.details).toMatchObject({ phone: "", address: "", city: "", name: "Sunrise Coffee Bar" });
  });
});

describe("autofill for a chain's website (BUG-117)", () => {
  // Two branches share the website: picking either one guessed the owner's city.
  const seattle = { ...COFFEE_PLACE, placeId: "ChIJ-fixture-sunrise-seattle", city: "Seattle", state: "WA", address: "1 Pike St, Seattle, WA" };

  it("picks no branch, leaves the location out, drops a description that names a city, and says why", async () => {
    const { clients, calls } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [seattle, COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);

    expect(run.placeId).toBeNull();
    expect(run.result.details).toMatchObject({ name: "Sunrise Coffee Bar", city: "", state: "", address: "", phone: "", description: "" });
    expect(run.result.details.services).toEqual(COFFEE_SITE_OUTPUT.services);
    expect(run.result.note).toBe(NOTES.chain);
    // Saved as businesses.is_chain, so the questions include chain ones (step 2).
    expect(run.chain).toBe(true);
    // No second search by name: it would only find another branch.
    expect(calls.places).toEqual([COFFEE_DOMAIN]);
  });

  it("keeps a description that names no place", async () => {
    const { clients } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [seattle, COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: { ...COFFEE_SITE_OUTPUT, description: "Coffee roasted in house, every day." } },
    });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    expect(run.result.details.description).toBe("Coffee roasted in house, every day.");
  });
});

describe("industry from Google's type (BUG-123)", () => {
  it("makes an unlisted type 'other' with Google's name for it, over the website's guess", async () => {
    const bookstore = { ...COFFEE_PLACE, primaryType: "book_store" };
    const { clients } = fakeClients({
      pages: COFFEE_PAGES,
      places: { [COFFEE_DOMAIN]: [bookstore] },
      outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
    });
    const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
    expect(run.result.details).toMatchObject({ industry: "other", industryText: "Bookstore" });
  });

  it("keeps a known type, and the website's guess when Google's type is too broad", async () => {
    for (const [primaryType, want] of [["cafe", "coffee_shop"], ["store", "coffee_shop"]] as const) {
      const { clients } = fakeClients({
        pages: COFFEE_PAGES,
        places: { [COFFEE_DOMAIN]: [{ ...COFFEE_PLACE, primaryType }] },
        outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT },
      });
      const run = await autofill({ domain: COFFEE_DOMAIN }, clients);
      expect(run.result.details.industry).toBe(want);
      expect(run.result.details.industryText).toBeUndefined();
    }
  });
});
