import { describe, expect, it } from "vitest";
import { isVagueOtherLabel, needsClearerIndustry, normaliseOtherLabel } from "./other-label";

describe("isVagueOtherLabel (2026-10-16)", () => {
  it("asks again for a label that says nothing about what the business does", () => {
    for (const label of ["", "  ", "Other", "Consultant", "Store", "Service", "Services", "Company", "Business", "Shop", "Agency", "Professional"]) {
      expect(isVagueOtherLabel(label), label).toBe(true);
    }
    for (const label of ["Local business", "Small Business", "Professional services", "Consulting firm", "Online store", "My company", "N/A", "123", "-", "x"]) {
      expect(isVagueOtherLabel(label), label).toBe(true);
    }
    expect(isVagueOtherLabel(null)).toBe(true);
  });

  it("accepts a label that names the kind of business", () => {
    for (const label of ["Florist", "IT consultant", "Marketing agency", "Bookstore", "Sportswear store", "General contractor", "General store", "Wedding venue", "Vet", "Gym", "Coffee roaster", "Car dealer"]) {
      expect(isVagueOtherLabel(label), label).toBe(false);
    }
  });
});

describe("needsClearerIndustry", () => {
  it("is false for our own industries and a clear label, true for a vague label or a bare other", () => {
    expect(needsClearerIndustry("dentist")).toBe(false);
    expect(needsClearerIndustry("Florist")).toBe(false);
    expect(needsClearerIndustry("other")).toBe(true);
    expect(needsClearerIndustry("Consultant")).toBe(true);
  });
});

describe("normaliseOtherLabel", () => {
  it("groups the same label however it was typed", () => {
    expect(normaliseOtherLabel("  Book-Store & Café. ")).toBe("book store and cafe");
    expect(normaliseOtherLabel("BOOKSTORE")).toBe(normaliseOtherLabel("bookstore "));
  });
});
