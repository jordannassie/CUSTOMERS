import { describe, expect, it } from "vitest";
import { placesTier, priceCall } from "./service";

const DETAILS = "https://places.googleapis.com/v1/places/ChIJ-abc";
const SEARCH = "https://places.googleapis.com/v1/places:searchText";

describe("what each paid service call costs (owner, 2026-11-17)", () => {
  it("prices a Google call at the tier of its costliest field", () => {
    expect(placesTier("id")).toBe("ids");
    expect(placesTier("addressComponents")).toBe("essentials");
    expect(placesTier("location,primaryType")).toBe("pro");
    expect(placesTier("places.id,places.displayName,places.rating")).toBe("enterprise");
    expect(placesTier("regularOpeningHours.weekdayDescriptions")).toBe("enterprise");
    // A field we don't know is priced high, never as free.
    expect(placesTier("someNewField")).toBe("enterprise");
  });

  it("uses Google's list prices for details and text search", () => {
    expect(priceCall(DETAILS, "addressComponents", 0.0038)).toEqual({ service: "google_places", sku: "Place Details Essentials", usd: 0.005 });
    expect(priceCall(DETAILS, "location,primaryType", 0.0038)?.usd).toBe(0.017);
    expect(priceCall(DETAILS, "id,rating,userRatingCount,regularOpeningHours.weekdayDescriptions", 0.0038)).toEqual({
      service: "google_places",
      sku: "Place Details Enterprise",
      usd: 0.02,
    });
    expect(priceCall(SEARCH, "places.id,places.displayName,places.formattedAddress", 0.0038)?.usd).toBe(0.032);
    expect(priceCall(SEARCH, "places.id,places.nationalPhoneNumber", 0.0038)).toEqual({ service: "google_places", sku: "Text Search Enterprise", usd: 0.035 });
  });

  it("leaves out free calls and anything that is not a paid service", () => {
    // System status's check asks for the id only, which Google does not charge for.
    expect(priceCall(DETAILS, "id", 0.0038)).toBeNull();
    expect(priceCall("https://api.openai.com/v1/responses", null, 0.0038)).toBeNull();
    expect(priceCall("not a url", null, 0.0038)).toBeNull();
  });

  it("prices a Firecrawl page at one credit of the plan", () => {
    expect(priceCall("https://api.firecrawl.dev/v2/scrape", null, 0.0038)).toEqual({ service: "firecrawl", sku: "Scrape, 1 credit", usd: 0.0038 });
    expect(priceCall("https://api.firecrawl.dev/v1/team/credit-usage", null, 0.0038)).toBeNull();
  });
});
