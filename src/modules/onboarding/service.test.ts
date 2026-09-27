import { describe, expect, it } from "vitest";
import { COFFEE_PLACE, COFFEE_SITE_OUTPUT } from "./fixtures";
import { industryFromPlacesType } from "./industries";
import { toDomain } from "./schema";
import { mergeDetails, sameSite } from "./service";

describe("toDomain", () => {
  it("accepts domains and URLs, and refuses anything else", () => {
    expect(toDomain("https://www.Sunrise-Coffee.com/about?x=1")).toBe("sunrise-coffee.com");
    expect(toDomain("sunrise-coffee.co.uk")).toBe("sunrise-coffee.co.uk");
    for (const bad of ["localhost", "http://127.0.0.1", "ftp://x.com", "not a site", "10.0.0.1"]) {
      expect(toDomain(bad)).toBeNull();
    }
  });
});

describe("sameSite", () => {
  it("matches the domain and its subdomains only", () => {
    expect(sameSite("https://www.sunrise.example/menu", "sunrise.example")).toBe(true);
    expect(sameSite("https://shop.sunrise.example", "sunrise.example")).toBe(true);
    expect(sameSite("https://notsunrise.example", "sunrise.example")).toBe(false);
    expect(sameSite(null, "sunrise.example")).toBe(false);
  });
});

describe("industryFromPlacesType", () => {
  it("maps known Places types and leaves others to the website", () => {
    expect(industryFromPlacesType("cafe")).toBe("coffee_shop");
    expect(industryFromPlacesType("sushi_restaurant")).toBe("restaurant");
    expect(industryFromPlacesType("dental_clinic")).toBe("dentist");
    expect(industryFromPlacesType("marketing_agency")).toBeNull();
    expect(industryFromPlacesType(null)).toBeNull();
  });
});

describe("mergeDetails", () => {
  it("uses the site's category when Places has none that maps", () => {
    const merged = mergeDetails(COFFEE_SITE_OUTPUT, { ...COFFEE_PLACE, primaryType: "store" });
    expect(merged.industry).toBe("coffee_shop");
  });

  it("takes city, state and country from the Places address so they agree with it", () => {
    const site = { ...COFFEE_SITE_OUTPUT, city: "Springfield", state: "Illinois" };
    const place = { ...COFFEE_PLACE, city: "Chatham", state: "IL" };
    expect(mergeDetails(site, place)).toMatchObject({ city: "Chatham", state: "IL", address: COFFEE_PLACE.address });
  });

  it("falls back to the site for any field Places leaves empty", () => {
    const place = { ...COFFEE_PLACE, phone: null, address: null };
    expect(mergeDetails(COFFEE_SITE_OUTPUT, place)).toMatchObject({
      phone: COFFEE_SITE_OUTPUT.phone,
      address: COFFEE_SITE_OUTPUT.address,
      city: "Springfield",
    });
  });
});
