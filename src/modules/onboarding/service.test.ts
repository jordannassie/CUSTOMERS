import { describe, expect, it } from "vitest";
import { COFFEE_PLACE, COFFEE_SITE_OUTPUT } from "./fixtures";
import { industriesFromPlacesTypes, industryFromPlacesType } from "./industries";
import { toDomain } from "./schema";
import { industryCheck, mergeDetails, sameSite, toResult, NOTES } from "./service";

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

  it("prefills the brand when Google's name is a page title, and keeps a plain name (2026-10-15)", () => {
    const titled = { ...COFFEE_PLACE, name: "Wilshire Smile Studio - Los Angeles Dentist, Cosmetic...", websiteUri: "https://wilshiresmilestudio.com/" };
    expect(mergeDetails(COFFEE_SITE_OUTPUT, titled).name).toBe("Wilshire Smile Studio");
    expect(mergeDetails(COFFEE_SITE_OUTPUT, COFFEE_PLACE).name).toBe(COFFEE_PLACE.name);
    expect(mergeDetails(COFFEE_SITE_OUTPUT, { ...COFFEE_PLACE, name: null }).name).toBe(COFFEE_SITE_OUTPUT.name);
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

describe("industry when Google and the website disagree", () => {
  const timHortons = {
    ...COFFEE_PLACE,
    name: "Tim Hortons",
    primaryType: "restaurant",
    types: ["cafe", "coffee_shop", "restaurant", "food", "point_of_interest", "establishment"],
  };
  const coffeeSite = { ...COFFEE_SITE_OUTPUT, industry: "coffee_shop" as const };

  it("takes the website's industry when one of the listing's other types is that industry (Tim Hortons)", () => {
    expect(mergeDetails(coffeeSite, timHortons).industry).toBe("coffee_shop");
    expect(industryCheck(coffeeSite, timHortons)).toBeNull();
  });

  it("keeps Google's industry when no listing type backs the website, and asks the user to check", () => {
    const steakhouse = { ...timHortons, types: ["restaurant", "food", "establishment"] };
    expect(mergeDetails(coffeeSite, steakhouse).industry).toBe("restaurant");
    expect(industryCheck(coffeeSite, steakhouse)).toEqual({ google: "Restaurant", website: "Coffee shop" });
  });

  it("keeps BUG-123: a bookstore that also lists a cafe stays Other: Bookstore", () => {
    const bookstore = { ...COFFEE_PLACE, primaryType: "book_store", types: ["book_store", "cafe", "store"] };
    expect(mergeDetails(coffeeSite, bookstore)).toMatchObject({ industry: "other", industryText: "Bookstore" });
    expect(industryCheck(coffeeSite, bookstore)).toEqual({ google: "Bookstore", website: "Coffee shop" });
  });

  it("takes coffee shop for a fast_food_restaurant listing that also lists coffee_shop", () => {
    const fastFood = { ...timHortons, primaryType: "fast_food_restaurant", types: ["fast_food_restaurant", "coffee_shop", "restaurant", "food"] };
    expect(mergeDetails(coffeeSite, fastFood).industry).toBe("coffee_shop");
  });

  it("gives a plumber and a dentist the same industry as before", () => {
    const plumberPlace = { ...COFFEE_PLACE, primaryType: "plumber", types: ["plumber", "point_of_interest", "establishment"] };
    const dentistPlace = { ...COFFEE_PLACE, primaryType: "dental_clinic", types: ["dental_clinic", "dentist", "health"] };
    expect(mergeDetails({ ...COFFEE_SITE_OUTPUT, industry: "plumber" }, plumberPlace).industry).toBe("plumber");
    expect(mergeDetails({ ...COFFEE_SITE_OUTPUT, industry: "dentist" }, dentistPlace).industry).toBe("dentist");
    // The website alone, or Google alone, as before.
    expect(mergeDetails({ ...COFFEE_SITE_OUTPUT, industry: "plumber" }, null).industry).toBe("plumber");
    expect(mergeDetails(null, dentistPlace).industry).toBe("dentist");
    // A website that says something else does not overrule Google when no listing type backs it.
    expect(mergeDetails({ ...COFFEE_SITE_OUTPUT, industry: "dentist" }, plumberPlace).industry).toBe("plumber");
  });

  it("asks nothing when they agree or one says nothing", () => {
    expect(industryCheck(coffeeSite, COFFEE_PLACE)).toBeNull();
    expect(industryCheck({ ...coffeeSite, industry: "" }, timHortons)).toBeNull();
    expect(industryCheck(coffeeSite, null)).toBeNull();
    expect(industriesFromPlacesTypes(timHortons.types)).toEqual(new Set(["coffee_shop", "restaurant"]));
  });

  it("passes the check to the details step through auto-fill", () => {
    const result = toResult({ details: mergeDetails(coffeeSite, timHortons), fromWebsite: true, fromGoogle: true, hadWebsite: true, industryCheck: { google: "Restaurant", website: "Coffee shop" } });
    expect(result.industryCheck).toEqual({ google: "Restaurant", website: "Coffee shop" });
    expect(toResult({ details: mergeDetails(coffeeSite, COFFEE_PLACE), fromWebsite: true, fromGoogle: true, hadWebsite: true }).industryCheck).toBeUndefined();
  });
});

describe("the auto-fill note (step 9a, BUG-144)", () => {
  it("never repeats the \"We filled this in from your website\" line the details step already shows", () => {
    const result = toResult({ details: mergeDetails(COFFEE_SITE_OUTPUT, null), fromWebsite: true, fromGoogle: false, hadWebsite: true });
    expect(result.note).toBe(NOTES.websiteOnly);
    expect(result.note).not.toMatch(/We filled this in/);
  });
});
