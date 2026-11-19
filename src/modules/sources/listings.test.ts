import { describe, expect, it } from "vitest";
import { canGetListed, ctaFor, fixFor, impactFor, listedFirst, siteAction, siteKey, usedLine } from "./listings";
import type { Site } from "./service";

const site = (host: string, kind: Site["kind"], answers: number, withoutYou: number, extra: Partial<Site> = {}): Site => ({
  host,
  type: "business",
  typeLabel: "Business sites",
  kind,
  kindLabel: kind,
  answers,
  answersWithoutYou: withoutYou,
  models: ["openai"],
  mentions: kind === "competitor" ? "competitor" : kind === "own" ? "own" : withoutYou >= answers ? "no" : withoutYou === 0 ? "always" : "sometimes",
  names: [],
  competitorId: null,
  ...extra,
});

describe("impactFor", () => {
  it("is high from 1 in 5 answers (and at least 3), medium from 1 in 20 or 2 answers, low otherwise", () => {
    expect(impactFor(33, 66)).toBe("high");
    expect(impactFor(12, 66)).toBe("medium");
    expect(impactFor(2, 5)).toBe("medium");
    expect(impactFor(1, 3)).toBe("medium");
    expect(impactFor(1, 40)).toBe("low");
    expect(impactFor(0, 0)).toBe("low");
  });
});

describe("listedFirst", () => {
  it("ranks by answers that skipped you, leaving out competitor, business and own sites", () => {
    const sites = [
      site("jfcpizza.com", "competitor", 40, 40),
      site("tripadvisor.com", "reviews", 30, 10),
      site("foodpanda.pk", "delivery", 20, 20),
      site("beantherecoffee.example", "own", 15, 15),
      site("randomblog.com", "business", 14, 14),
      site("thecookbook.pk", "food_guide", 12, 12),
      site("google.com", "directory", 10, 10),
      site("tiktok.com", "social", 8, 8),
      site("facebook.com", "social", 7, 0),
    ];
    expect(listedFirst(sites).map((s) => s.host)).toEqual(["foodpanda.pk", "thecookbook.pk", "tripadvisor.com", "google.com"]);
    expect(listedFirst(sites, 10).map((s) => s.host)).not.toContain("facebook.com");
  });

  it("breaks ties by how often the site was used, then by name", () => {
    const sites = [site("b.com", "directory", 5, 3), site("a.com", "directory", 4, 3), site("c.com", "directory", 5, 3)];
    expect(listedFirst(sites).map((s) => s.host)).toEqual(["b.com", "c.com", "a.com"]);
  });
});

describe("fixFor", () => {
  it("gives one fix per kind", () => {
    expect(fixFor({ host: "yelp.com", kind: "reviews" }, null)).toMatch(/^Claim your listing/);
    expect(fixFor({ host: "bbb.org", kind: "directory" }, null)).toMatch(/^Claim your listing/);
    expect(fixFor({ host: "google.com", kind: "directory" }, null)).toMatch(/Google Business Profile/);
    expect(fixFor({ host: "foodpanda.pk", kind: "delivery" }, null)).toBe("Complete your page: menu, prices, hours and reviews.");
    expect(fixFor({ host: "thecookbook.pk", kind: "food_guide" }, "Rawalpindi")).toBe("Ask to be added to their lists of local favorites in Rawalpindi.");
    expect(fixFor({ host: "in.trip.com", kind: "travel_guide" }, null)).toBe("Ask to be added to their lists of local favorites.");
    expect(fixFor({ host: "tiktok.com", kind: "social" }, null)).toMatch(/tag your location/);
  });
});

describe("usedLine", () => {
  it("says how many answers skipped you", () => {
    expect(usedLine({ answers: 33, answersWithoutYou: 33 })).toBe("Used in 33 answers that did not name you.");
    expect(usedLine({ answers: 24, answersWithoutYou: 20 })).toBe("Used in 24 answers, 20 without naming you.");
    expect(usedLine({ answers: 1, answersWithoutYou: 1 })).toBe("Used in 1 answer that did not name you.");
  });
});

describe("siteAction", () => {
  it("builds the Add to Actions input with the key Compare shares", () => {
    expect(siteAction(site("yelp.com", "reviews", 12, 10), 66, { place: "Orange", toolLabel: null })).toEqual({
      title: "Get listed on yelp.com",
      fact: "AI used yelp.com in 12 of 66 answers in the last 30 days, and 10 of them did not name you.",
      whatToDo: "Claim your listing and complete it: hours, photos, services and reviews.",
      whereToApply: "yelp.com",
      impact: "medium",
      category: "reviews_reputation",
      source: "sources",
      dedupeKey: "site:yelp.com",
      evidenceData: { domain: "yelp.com", answers: 12 },
    });
    const delivery = siteAction(site("foodpanda.pk", "delivery", 33, 33), 66, { place: null, toolLabel: "ChatGPT" });
    expect(delivery).toMatchObject({ title: "Complete your page on foodpanda.pk", category: "citations", impact: "high" });
    expect(delivery.fact).toMatch(/^ChatGPT used foodpanda.pk/);
    expect(siteKey("yelp.com")).toBe("site:yelp.com");
  });
});

describe("ctaFor", () => {
  it("is Get listed when the site skips you, Improve when it names you, Compare for a tracked competitor", () => {
    expect(ctaFor(site("yelp.com", "reviews", 5, 5))).toBe("listed");
    expect(ctaFor(site("yelp.com", "reviews", 5, 2))).toBe("improve");
    expect(ctaFor(site("beantherecoffee.example", "own", 5, 5))).toBe("improve");
    expect(ctaFor(site("dailygrind.example", "competitor", 5, 5, { competitorId: "c1" }))).toBe("compare");
    expect(ctaFor(site("jfcpizza.com", "competitor", 5, 5))).toBeNull();
    expect(ctaFor(site("randomblog.com", "business", 5, 5))).toBeNull();
    expect(canGetListed(site("randomblog.com", "business", 5, 5))).toBe(false);
  });
});
