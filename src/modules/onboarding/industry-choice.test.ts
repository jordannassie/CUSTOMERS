import { describe, expect, it } from "vitest";
import { COFFEE_PLACE, COFFEE_SITE_OUTPUT } from "./fixtures";
import { chooseIndustry, industryCheck } from "./industry-choice";
import type { PlaceCandidate } from "./places";
import type { AutofillOutput } from "./prompts/business-autofill.v1";

// 2026-10-15: Google no longer overrules a clear website answer with a type that is none of our industries.
const site = (over: Partial<AutofillOutput>): AutofillOutput => ({ ...COFFEE_SITE_OUTPUT, ...over });
const place = (primaryType: string, types: string[], over: Partial<PlaceCandidate> = {}): PlaceCandidate => ({
  ...COFFEE_PLACE,
  primaryType,
  types,
  ...over,
});

const medSpaSite = site({
  name: "Perfect Med Spa",
  industry: "med_spa",
  description: "Med spa in Manhattan.",
  services: ["Botox", "dermal fillers", "laser hair removal", "chemical peels"],
});
const hvacSite = site({
  name: "Cool Breeze Heating & Air",
  industry: "hvac",
  services: ["AC repair", "furnace installation", "heat pump service", "duct cleaning", "water heater repair"],
});

describe("chooseIndustry", () => {
  it("med spa: Google's spa, skin care clinic or beauty salon with a med spa website is a med spa", () => {
    expect(chooseIndustry(medSpaSite, place("spa", ["spa", "skin_care_clinic", "beauty_salon"]))).toEqual({ industry: "med_spa" });
    expect(chooseIndustry(medSpaSite, place("skin_care_clinic", ["skin_care_clinic", "health"]))).toEqual({ industry: "med_spa" });
    expect(chooseIndustry(medSpaSite, place("medical_spa", ["medical_spa"]))).toEqual({ industry: "med_spa" });
    // A beauty salon listing that also names a skin care clinic, for a site about Botox and lasers.
    expect(chooseIndustry(medSpaSite, place("beauty_salon", ["beauty_salon", "skin_care_clinic", "spa"]))).toEqual({ industry: "med_spa" });
    expect(industryCheck(medSpaSite, place("spa", ["spa", "skin_care_clinic", "beauty_salon"]))).toBeNull();
  });

  it("a skin care clinic is a med spa only when the business mentions medical treatments", () => {
    const facials = site({ name: "Glow Skin", industry: "other", confidence: "high", services: ["facials", "waxing", "brow tinting"] });
    expect(chooseIndustry(facials, place("skin_care_clinic", ["skin_care_clinic"]))).toEqual({ industry: "other", industryText: "Skin care clinic" });
    expect(chooseIndustry(null, place("medical_spa", ["medical_spa"]))).toEqual({ industry: "other", industryText: "Medical spa" });
  });

  it("HVAC: Google's plumber, electrician or general contractor never overrules a heating and cooling website", () => {
    for (const type of ["plumber", "electrician", "general_contractor"]) {
      expect(chooseIndustry(hvacSite, place(type, [type, "point_of_interest"]))).toEqual({ industry: "hvac" });
      expect(chooseIndustry({ ...hvacSite, confidence: "low" }, place(type, [type]))).toEqual({ industry: "hvac" });
    }
    expect(industryCheck(hvacSite, place("plumber", ["plumber"]))).toBeNull();
  });

  it("a heating and cooling name is HVAC when the website gave nothing (Gem Heating & Air Conditioning, 2026-10-15 eval)", () => {
    const gem = place("general_contractor", ["general_contractor"], { name: "Gem Heating & Air Conditioning" });
    expect(chooseIndustry(null, gem)).toEqual({ industry: "hvac" });
    expect(chooseIndustry(site({ industry: "", services: [], confidence: "low" }), gem)).toEqual({ industry: "hvac" });
    // Another trade in the name keeps Google's type.
    const both = place("plumber", ["plumber"], { name: "Smith Plumbing & Heating" });
    expect(chooseIndustry(null, both)).toEqual({ industry: "plumber" });
    expect(chooseIndustry(null, place("electrician", ["electrician"], { name: "Bright Electric" }))).toEqual({ industry: "other", industryText: "Electrician" });
  });

  it("a plumber whose site says HVAC but lists mostly plumbing stays a plumber, and asks the user to check", () => {
    const mostlyPlumbing = site({ industry: "hvac", services: ["drain cleaning", "leak repair", "water heaters", "AC repair"] });
    expect(chooseIndustry(mostlyPlumbing, place("plumber", ["plumber"]))).toEqual({ industry: "plumber" });
    expect(industryCheck(mostlyPlumbing, place("plumber", ["plumber"]))).toEqual({ google: "Plumber", website: "HVAC (heating and air conditioning)" });
  });

  it("bookstore: Google's book_store with a website that says other is Other: Bookstore", () => {
    const books = site({ name: "BookWoman", industry: "other", services: ["new books", "author events", "gift cards"] });
    expect(chooseIndustry(books, place("book_store", ["book_store", "store"]))).toEqual({ industry: "other", industryText: "Bookstore" });
  });

  it("keeps BUG-123: a bookstore listing that also names a cafe stays Other: Bookstore, and asks the user to check", () => {
    const cafeInside = site({ industry: "coffee_shop" });
    const bookstore = place("book_store", ["book_store", "cafe", "store"]);
    expect(chooseIndustry(cafeInside, bookstore)).toEqual({ industry: "other", industryText: "Bookstore" });
    expect(industryCheck(cafeInside, bookstore)).toEqual({ google: "Bookstore", website: "Coffee shop" });
  });

  it("an unmapped Google type stays Other when the website is unsure, says other or says nothing", () => {
    const clothing = place("clothing_store", ["clothing_store", "store"]);
    expect(chooseIndustry(site({ industry: "salon", confidence: "low" }), clothing)).toEqual({ industry: "other", industryText: "Clothing store" });
    expect(chooseIndustry(site({ industry: "other" }), clothing)).toEqual({ industry: "other", industryText: "Clothing store" });
    expect(chooseIndustry(null, clothing)).toEqual({ industry: "other", industryText: "Clothing store" });
  });

  it("Tim Hortons is unchanged: a restaurant listing that also says coffee_shop, with a coffee shop website", () => {
    const timHortons = place("restaurant", ["cafe", "coffee_shop", "restaurant", "food"], { name: "Tim Hortons" });
    expect(chooseIndustry(site({ industry: "coffee_shop" }), timHortons)).toEqual({ industry: "coffee_shop" });
    expect(chooseIndustry(site({ industry: "coffee_shop" }), place("restaurant", ["restaurant", "food"]))).toEqual({ industry: "restaurant" });
  });

  it("plumber and dentist are unchanged", () => {
    expect(chooseIndustry(site({ industry: "plumber", services: ["drain cleaning"] }), place("plumber", ["plumber"]))).toEqual({ industry: "plumber" });
    expect(chooseIndustry(site({ industry: "dentist" }), place("dental_clinic", ["dental_clinic", "dentist"]))).toEqual({ industry: "dentist" });
    // A mapped Google type is still not overruled by a website it does not list.
    expect(chooseIndustry(site({ industry: "dentist" }), place("plumber", ["plumber"]))).toEqual({ industry: "plumber" });
  });
});
