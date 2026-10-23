import { describe, expect, it } from "vitest";
import { autofill } from "./autofill";
import { brandGuesses, pickBrandPlace } from "./autofill-fallback";
import { BLOCKED_PAGES, COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "./fixtures";
import { AUTOFILL_MODEL } from "./prompts/business-autofill.v1";
import type { PlaceCandidate } from "./places";
import { NOTES, unreadableNote } from "./service";

// B7: ebookwoman.com can't be read, and Google does not find "ebookwoman.com" as text. The brand it spells is BookWoman.
const BOOKWOMAN: PlaceCandidate = {
  ...COFFEE_PLACE,
  placeId: "ChIJ-fixture-bookwoman",
  name: "BookWoman",
  address: "5501 N Lamar Blvd, Austin, TX 78751, USA",
  primaryType: "book_store",
  websiteUri: "https://www.ebookwoman.com/",
  city: "Austin",
  state: "TX",
  area: "Brentwood",
};

describe("brand guesses from a domain", () => {
  it("reads the brand a domain spells", () => {
    expect(brandGuesses("ebookwoman.com")).toEqual(["ebookwoman", "bookwoman"]);
    expect(brandGuesses("www.thebookwoman.co.uk".replace("www.", ""))).toEqual(["thebookwoman", "bookwoman"]);
    expect(brandGuesses("book-woman.com")).toEqual(["book woman"]);
    // At most 2 Places searches, however many guesses the name allows.
    expect(brandGuesses("the-book-woman.co.uk")).toEqual(["the book woman", "bookwoman"]);
    expect(brandGuesses("cheezious.com")).toEqual(["cheezious"]);
    expect(brandGuesses("go.com")).toEqual([]);
  });

  it("takes only a listing for this website, never one that just shares the name", () => {
    expect(pickBrandPlace([COFFEE_PLACE, BOOKWOMAN], "ebookwoman.com")).toBe(BOOKWOMAN);
    // Another business with a similar name and its own website is not this one.
    expect(pickBrandPlace([{ ...BOOKWOMAN, websiteUri: "https://bookwoman-gifts.example" }], "ebookwoman.com")).toBeNull();
    // The brand search has no city: a website-less "BookWoman" may be a shop in another state.
    expect(pickBrandPlace([{ ...BOOKWOMAN, websiteUri: null }], "ebookwoman.com")).toBeNull();
  });

  it("leaves the form to the user when the only brand match has no website", async () => {
    const elsewhere = { ...BOOKWOMAN, placeId: "ChIJ-fixture-bookwoman-elsewhere", websiteUri: null, city: "Portland", state: "OR" };
    const { clients } = fakeClients({ pages: BLOCKED_PAGES, places: { bookwoman: [elsewhere] } });
    const run = await autofill({ domain: "ebookwoman.com" }, clients);
    expect(run.placeId).toBeNull();
    expect(run.result.details).toMatchObject({ name: "", city: "", phone: "", address: "" });
  });
});

describe("autofill when the website can't be read (B7)", () => {
  it("searches Google for the brand the domain spells and fills from the listing", async () => {
    const { clients, calls } = fakeClients({ pages: BLOCKED_PAGES, places: { bookwoman: [BOOKWOMAN] } });
    const run = await autofill({ domain: "ebookwoman.com" }, clients);

    expect(calls.places).toEqual(["ebookwoman.com", "ebookwoman", "bookwoman"]);
    expect(run.placeId).toBe(BOOKWOMAN.placeId);
    expect(run.result.note).toBe(unreadableNote("ebookwoman.com", true, "google"));
    expect(run.result.details).toMatchObject({ name: "BookWoman", city: "Austin", state: "TX" });
    expect(calls.extract).toEqual([]);
    expect(run.problems).toEqual([expect.objectContaining({ provider: "firecrawl", message: expect.stringContaining("Nothing readable on ebookwoman.com") })]);
  });

  it("logs why when nothing at all is found", async () => {
    const { clients } = fakeClients({ pages: new Error("Firecrawl returned 500"), places: new Error("Places returned 403") });
    const run = await autofill({ domain: "ebookwoman.com" }, clients);
    // Both sources failed: a provider outage, so not "we couldn't find your business" (D-84).
    expect(run.result.note).toBe(NOTES.unavailable);
    expect(run.problems.map((p) => p.message).join("\n")).toMatch(/Reading ebookwoman.com failed: Firecrawl returned 500[\s\S]*Places returned 403/);
  });

  it("doesn't search for a brand when the site was read", async () => {
    const { clients, calls } = fakeClients({ pages: COFFEE_PAGES, places: {}, outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT } });
    const run = await autofill({ domain: "sunrise-coffee.example" }, clients);
    expect(calls.places).not.toContain("sunrise coffee");
    expect(calls.places).not.toContain("sunrisecoffee");
    expect(run.problems).toEqual([]);
  });
});
