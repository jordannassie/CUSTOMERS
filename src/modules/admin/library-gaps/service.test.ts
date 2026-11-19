import { describe, expect, it } from "vitest";
import { libraryGaps, otherLabelKey } from "./service";

describe("libraryGaps (MVP_SPEC 5.3)", () => {
  it("lists industries with no active library, most businesses first", () => {
    const gaps = libraryGaps(["Bookstore", "coffee_shop", "bookstore", "plumber", "Yoga studio", null, "other", ""], new Set(["plumber"]));
    expect(gaps).toEqual([
      { label: "Bookstore", listed: false, businesses: 2, vague: false },
      { label: "Coffee shop", listed: true, businesses: 1, vague: false },
      { label: "Yoga studio", listed: false, businesses: 1, vague: false },
    ]);
  });

  it("is empty when every industry has a library", () => {
    expect(libraryGaps(["plumber", "dentist"], new Set(["plumber", "dentist"]))).toEqual([]);
  });

  it("counts each Other label however it was typed, shown as most businesses typed it (2026-10-16)", () => {
    const gaps = libraryGaps(
      ["Book-Store", "bookstores ", "BOOKSTORE", "book store", "Electricians", "electrician", "Electrician", "Consultant", "consultants"],
      new Set(),
    );
    expect(gaps).toEqual([
      { label: "Book-Store", listed: false, businesses: 4, vague: false },
      { label: "Electrician", listed: false, businesses: 3, vague: false },
      { label: "Consultant", listed: false, businesses: 2, vague: true },
    ]);
  });
});

describe("otherLabelKey", () => {
  it("groups case, punctuation, spaces and a plural last word, but not a word that only ends in s", () => {
    expect(otherLabelKey("  Marketing   Agencies")).toBe(otherLabelKey("marketing agencies"));
    expect(otherLabelKey("Florists")).toBe("florist");
    expect(otherLabelKey("IT Services")).toBe("itservice");
    expect(otherLabelKey("Book store")).toBe(otherLabelKey("bookstores"));
    expect(otherLabelKey("Fitness")).toBe("fitness");
    expect(otherLabelKey("Bus")).toBe("bus");
  });
});
