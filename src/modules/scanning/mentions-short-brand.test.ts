// Short brands ("KFC", "BMW", "H&M", "IHOP"): written exactly so, they count without a second signal; written any
// other way, or a short name that reads like a word ("Ace"), still needs the city, domain or phone nearby.
import { describe, expect, it } from "vitest";
import { findExactBrand, shortBrand } from "./short-brand";
import { detectMention, detectMentions } from "./mentions";

const islamabad = { city: "Islamabad", hasWebsite: true };
const austin = { city: "Austin", hasWebsite: true };
const counts = (answer: string, target: Parameters<typeof detectMention>[1]) => detectMention(answer, target).mentioned;

describe("short brands written in capitals", () => {
  it("count when written exactly so, with no city nearby", () => {
    expect(counts("KFC is a popular choice for fried chicken.", { name: "KFC", ...islamabad })).toBe(true);
    expect(counts("Try H&M for affordable basics.", { name: "H&M", ...islamabad })).toBe(true);
    expect(counts("IHOP does pancakes all day.", { name: "IHOP", ...austin })).toBe(true);
    expect(counts("For a BMW, most people go to the dealer.", { name: "BMW", ...austin })).toBe(true);
    expect(counts("KFC's zinger burger is the one to get.", { name: "KFC", ...islamabad })).toBe(true);
  });

  it("count a longer name built on one, like BMW of Austin", () => {
    expect(counts("For service, BMW of Austin is the official dealer.", { name: "BMW of Austin", ...austin })).toBe(true);
  });

  it("need the city when written in lowercase prose", () => {
    expect(counts("I had a kfc style bucket at home.", { name: "KFC", ...islamabad })).toBe(false);
    expect(counts("In Islamabad, the kfc on Jinnah Avenue is busy.", { name: "KFC", ...islamabad })).toBe(true);
  });

  it("are a whole word, never part of another", () => {
    expect(counts("KFCs everywhere sell the same bucket.", { name: "KFC", ...islamabad })).toBe(false);
    expect(counts("The BMWX line is new.", { name: "BMW", ...austin })).toBe(false);
    expect(findExactBrand("H&M and H&Ms", "H&M")).toEqual([0]);
  });

  it("count for competitors the same way", () => {
    const { competitors } = detectMentions("KFC and McDonald's are the usual picks.", { name: "Cheezious", ...islamabad }, [
      { name: "KFC", city: "Islamabad" },
    ]);
    expect(competitors[0]).toMatchObject({ name: "KFC", mentioned: true });
  });

  it("still need a second signal for a business without a website (D-08)", () => {
    expect(counts("KFC is a popular choice.", { name: "KFC", city: "Islamabad", hasWebsite: false })).toBe(false);
    expect(counts("KFC in Islamabad is a popular choice.", { name: "KFC", city: "Islamabad", hasWebsite: false })).toBe(true);
  });
});

describe("short names that read like words keep the second-signal rule", () => {
  it("Ace needs the city, written as a name or not", () => {
    expect(counts("Ace is a solid choice for repairs.", { name: "Ace", ...austin })).toBe(false);
    expect(counts("Ace is a solid choice for repairs in Austin.", { name: "Ace", ...austin })).toBe(true);
    expect(counts("an ace plumber in Austin", { name: "Ace", ...austin })).toBe(false);
  });

  it("A ce Plumbing does not count for Ace", () => {
    expect(counts("A ce Plumbing in Austin fixed it.", { name: "Ace", ...austin })).toBe(false);
  });

  it("only capitals or & make a short brand", () => {
    expect(shortBrand("KFC")).toBe("KFC");
    expect(shortBrand("H&M")).toBe("H&M");
    expect(shortBrand("IHOP")).toBe("IHOP");
    expect(shortBrand("Ace")).toBeNull();
    expect(shortBrand("ace")).toBeNull();
    expect(shortBrand("STARBUCKS")).toBeNull();
  });
});
