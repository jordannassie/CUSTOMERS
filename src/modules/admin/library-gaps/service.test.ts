import { describe, expect, it } from "vitest";
import { libraryGaps } from "./service";

describe("libraryGaps (MVP_SPEC 5.3)", () => {
  it("lists industries with no active library, most businesses first", () => {
    const gaps = libraryGaps(["Bookstore", "coffee_shop", "bookstore", "plumber", "Yoga studio", null, "other", ""], new Set(["plumber"]));
    expect(gaps).toEqual([
      { label: "Bookstore", listed: false, businesses: 2 },
      { label: "Coffee shop", listed: true, businesses: 1 },
      { label: "Yoga studio", listed: false, businesses: 1 },
    ]);
  });

  it("is empty when every industry has a library", () => {
    expect(libraryGaps(["plumber", "dentist"], new Set(["plumber", "dentist"]))).toEqual([]);
  });
});
