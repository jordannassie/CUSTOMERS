import { describe, expect, it } from "vitest";
import { attachFixes, fixFor, fixRef } from "./fix-match";

const fixes = [
  fixRef({ id: "yelp", where: "other_places", title: "Claim your Yelp listing", recommendedAction: "Add the same phone number." }),
  fixRef({ id: "faq", where: "website", title: "Add an FAQ section", recommendedAction: "Answer the top questions." }),
  fixRef({ id: "reviews", where: "google_listing", title: "Get more Google reviews" }),
  fixRef({ id: "brunch", where: "website", title: "Write a brunch page", description: "Say you serve brunch on weekends." }),
];

describe("fixFor", () => {
  it("opens the fix about the same thing, in the same place", () => {
    expect(fixFor({ where: "other_places", match: ["yelp.com", "yelp"] }, fixes)).toBe("yelp");
    expect(fixFor({ where: "website", match: ["faq"] }, fixes)).toBe("faq");
    expect(fixFor({ where: "website", match: ["brunch"] }, fixes)).toBe("brunch");
    expect(fixFor({ where: "google_listing", match: ["review"] }, fixes)).toBe("reviews");
  });

  it("never opens just the first fix of a group", () => {
    expect(fixFor({ where: "website", match: ["hours"] }, fixes)).toBeNull();
    expect(fixFor({ where: "website" }, fixes)).toBeNull();
    expect(fixFor({ where: null, match: ["faq"] }, fixes)).toBeNull();
  });

  it("needs the same place: a Google review fix doesn't answer a website reason", () => {
    expect(fixFor({ where: "website", match: ["review"] }, fixes)).toBeNull();
  });

  it("matches the start of a word only", () => {
    expect(fixFor({ where: "website", match: ["unch"] }, fixes)).toBeNull();
  });
});

describe("attachFixes", () => {
  it("sets fixId only where a fix fits and keeps the rest as they are", () => {
    const facts: { title: string; where: "website"; match: string[]; fixId?: string }[] = [
      { title: "a", where: "website", match: ["faq"] },
      { title: "b", where: "website", match: ["parking"] },
    ];
    const out = attachFixes(facts, fixes);
    expect(out[0].fixId).toBe("faq");
    expect(out[1]).toBe(facts[1]);
  });
});
