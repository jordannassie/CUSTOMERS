import { describe, expect, it } from "vitest";
import { detectMention } from "./mentions";
import { findPlace } from "./place-text";

describe("findPlace", () => {
  it("finds a place also in the possessive, and only as whole words", () => {
    expect(findPlace("Visit Islamabad's Blue Area", "Islamabad")).toEqual([6]);
    expect(findPlace("San Francisco’s oldest", "San Francisco")).toEqual([0]);
    expect(findPlace("Islamabadi food", "Islamabad")).toEqual([]);
    expect(findPlace("anything", "")).toEqual([]);
  });
});

describe("detectMention: the city written as City's (BUG-146)", () => {
  const kfc = { name: "Kentucky Fried Chicken", aliases: ["KFC"], city: "Islamabad", website: "kfcpakistan.com" };

  it("counts a short name with the city in the possessive nearby, straight or curly apostrophe", () => {
    expect(detectMention("The kfc in Islamabad's Blue Area is open late.", kfc).mentioned).toBe(true);
    expect(detectMention("The kfc in Islamabad’s Blue Area is open late.", kfc).mentioned).toBe(true);
    expect(detectMention("1. **Best Plumbing**: one of San Francisco's oldest.", { name: "Best Plumbing", city: "San Francisco" }).mentioned).toBe(true);
  });

  it("still needs the city: another city's possessive or no city does not count", () => {
    expect(detectMention("The kfc in Lahore's Mall Road is open late.", kfc).mentioned).toBe(false);
    expect(detectMention("We tried a kfc style bucket at home.", kfc).mentioned).toBe(false);
  });

  it("finds a no-website business with the city in the possessive (D-08)", () => {
    expect(detectMention("Hernandez Roofing is one of Austin's best roofers.", { name: "Hernandez Roofing", city: "Austin", hasWebsite: false }).mentioned).toBe(true);
  });
});
