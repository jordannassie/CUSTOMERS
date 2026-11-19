import { describe, expect, it } from "vitest";
import { autofill } from "./autofill";
import { factsFromPageMeta, nameFromTitle, sameBrandSite, splitHost } from "./autofill-safety";
import { ExtractError } from "./extract";
import { COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "./fixtures";
import { AUTOFILL_MODEL } from "./prompts/business-autofill.v1";
import type { PlaceCandidate } from "./places";
import { NOTES, pickPlaceForDomain } from "./service";

// Both Claude and the ChatGPT backup failed: an API error, not a model fault (D-84).
const AI_DOWN = new ExtractError("AI unavailable: anthropic credit 400; openai server 500", false);

const ADIDAS_PK: PlaceCandidate = {
  ...COFFEE_PLACE,
  placeId: "ChIJ-fixture-adidas-centaurus",
  name: "adidas",
  address: "Shop 105, Centaurus Mall, Islamabad, Pakistan",
  primaryType: "sportswear_store",
  websiteUri: "https://www.adidas.com.pk/stores/centaurus",
  city: "Islamabad",
  state: "Islamabad Capital Territory",
  country: "PK",
};

describe("sameBrandSite", () => {
  it("accepts the same domain, a subdomain either way, a path and the brand's country version", () => {
    expect(sameBrandSite("https://www.adidas.com/pk/stores", "adidas.com")).toBe(true);
    expect(sameBrandSite("https://shop.adidas.com", "adidas.com")).toBe(true);
    expect(sameBrandSite("https://adidas.com", "shop.adidas.com")).toBe(true);
    expect(sameBrandSite("https://www.adidas.com.pk/", "adidas.com")).toBe(true);
    expect(sameBrandSite("https://www.adidas.de/", "adidas.com")).toBe(true);
  });

  it("refuses another business's site or a reseller", () => {
    expect(sameBrandSite("https://www.sportsplus.pk/brands/adidas", "adidas.com")).toBe(false);
    expect(sameBrandSite("https://adidas-outlet.example", "adidas.com")).toBe(false);
    expect(sameBrandSite("https://notadidas.com", "adidas.com")).toBe(false);
    expect(sameBrandSite(null, "adidas.com")).toBe(false);
  });

  it("reads the brand label under a country suffix", () => {
    expect(splitHost("shop.adidas.com.pk")).toEqual({ label: "adidas", suffix: "com.pk" });
    expect(splitHost("firstlightaustin.com")).toEqual({ label: "firstlightaustin", suffix: "com" });
  });

  it("lets the domain search adopt the country listing when no listing names the exact domain", () => {
    expect(pickPlaceForDomain([ADIDAS_PK], "adidas.com")).toBe(ADIDAS_PK);
    expect(pickPlaceForDomain([ADIDAS_PK, { ...COFFEE_PLACE, websiteUri: "https://adidas.com/" }], "adidas.com")?.websiteUri).toBe(
      "https://adidas.com/",
    );
  });
});

describe("names from the page title", () => {
  it("keeps the part of the title that spells the domain's brand", () => {
    expect(nameFromTitle("adidas Official Website | adidas US", "adidas.com")).toBe("adidas");
    expect(nameFromTitle("First Light | Coffee in Austin", "firstlightaustin.com")).toBe("First Light");
    expect(nameFromTitle("Home - Sunrise Coffee Bar", "sunrise-coffee.example")).toBe("Sunrise Coffee Bar");
    expect(nameFromTitle(null, "adidas.com")).toBe("");
  });

  it("uses the home page title and meta description, and nothing else", () => {
    const pages = [{ ...COFFEE_PAGES[0], description: "Small-batch espresso and oat milk lattes in Springfield." }, ...COFFEE_PAGES.slice(1)];
    expect(factsFromPageMeta(pages, "sunrise-coffee.example")).toMatchObject({
      name: "Sunrise Coffee Bar",
      description: "Small-batch espresso and oat milk lattes in Springfield.",
      industry: "",
      services: [],
      city: "",
    });
    expect(factsFromPageMeta([{ path: "/", status: "blocked", markdown: "", title: null }], "x.example")).toBeNull();
  });
});

describe("auto-fill when no AI can read the site (D-84)", () => {
  const pages = [{ ...COFFEE_PAGES[0], description: "Small-batch espresso and oat milk lattes in Springfield." }, ...COFFEE_PAGES.slice(1)];

  it("fills the name and description from the page, finds the listing by that name, and says auto-fill is down", async () => {
    const { clients, calls } = fakeClients({
      pages,
      places: { "Sunrise Coffee Bar": [COFFEE_PLACE] },
      outputs: { [AUTOFILL_MODEL]: AI_DOWN },
    });
    const run = await autofill({ domain: "sunrise-coffee.example" }, clients);

    expect(calls.places).toEqual(["sunrise-coffee.example", "Sunrise Coffee Bar"]);
    expect(run.placeId).toBe(COFFEE_PLACE.placeId);
    expect(run.result.details).toMatchObject({ name: COFFEE_PLACE.name, description: "Small-batch espresso and oat milk lattes in Springfield." });
    expect(run.result.note).toBe(NOTES.unavailablePartly);
    // The failed read is logged, never silent.
    expect(run.problems).toEqual([expect.objectContaining({ provider: "anthropic", message: expect.stringContaining("AI unavailable") })]);
  });

  it("says auto-fill is unavailable, not that the business was not found, when nothing came back", async () => {
    const bare = pages.map((p) => ({ ...p, title: null, description: null }));
    const { clients } = fakeClients({ pages: bare, places: {}, outputs: { [AUTOFILL_MODEL]: AI_DOWN } });
    const run = await autofill({ domain: "sunrise-coffee.example" }, clients);
    expect(run.result.note).toBe(NOTES.unavailable);
    expect(run.result.note).not.toBe(NOTES.nothingFound);
  });

  it("searches Google by the domain's brand when the page gives no name", async () => {
    const { clients, calls } = fakeClients({
      pages: [{ path: "/", status: "ok", title: null, markdown: "# Shoes" }],
      places: { adidas: [ADIDAS_PK] },
      outputs: { [AUTOFILL_MODEL]: AI_DOWN },
    });
    const run = await autofill({ domain: "adidas.com" }, clients);
    expect(calls.places).toEqual(["adidas.com", "adidas"]);
    expect(run.placeId).toBe(ADIDAS_PK.placeId);
    expect(run.result.details).toMatchObject({ name: "adidas", city: "Islamabad" });
    expect(run.result.note).toBe(NOTES.unavailablePartly);
  });

  it("keeps the normal notes when the model answered but the answer was unusable", async () => {
    const fault = new ExtractError("returned JSON that does not match the schema", true);
    const { clients } = fakeClients({ pages, places: {}, outputs: { [AUTOFILL_MODEL]: fault } });
    const run = await autofill({ domain: "sunrise-coffee.example" }, clients);
    expect(run.result.note).toBe(NOTES.nothingFound);
    expect(COFFEE_SITE_OUTPUT.name).toBe("Sunrise Coffee Bar");
  });

  it("saves the model that actually read the site in the site facts", async () => {
    const { clients } = fakeClients({ pages: COFFEE_PAGES, places: {}, outputs: { [AUTOFILL_MODEL]: COFFEE_SITE_OUTPUT } });
    const backup = { ...clients, extract: async (input: Parameters<typeof clients.extract>[0]) => {
      input.answeredBy?.("gpt-4.1-mini-2025-04-14");
      return clients.extract(input);
    } };
    const run = await autofill({ domain: "sunrise-coffee.example" }, backup);
    expect(run.siteFacts?.model).toBe("gpt-4.1-mini-2025-04-14");
  });
});
