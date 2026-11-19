import { describe, expect, it } from "vitest";
import type { StandingCheck } from "./checks";
import { googleArea, listingsArea, pagesUsed, quotesArea, sourceBreakdown, websiteArea } from "./gap";

const check = (over: Partial<StandingCheck>): StandingCheck => ({ provider: "openai", questionId: "q1", youNamed: false, competitors: [], extracted: null, sites: [], ...over });
const them = ["Bean House"];

describe("sourceBreakdown", () => {
  it("splits the score's answers by the kind of site used, biggest gap first", () => {
    const rows = sourceBreakdown(
      [
        check({ competitors: them, sites: ["yelp.com", "beanhouse.example"] }),
        check({ competitors: them, sites: ["yelp.com"] }),
        check({ youNamed: true, sites: ["sunrise.example"] }),
        check({ youNamed: true, competitors: them, sites: [] }),
      ],
      "Bean House",
      "sunrise.example",
      "beanhouse.example",
    );
    expect(rows.map((r) => [r.key, r.answers, r.them, r.you])).toEqual([
      ["listings", 2, 2, 0],
      ["their_site", 1, 1, 0],
      ["none", 1, 1, 1],
      ["your_site", 1, 0, 1],
    ]);
    expect(rows[0]).toMatchObject({ label: "Review sites and directories", hosts: ["yelp.com"] });
  });
});

describe("areas", () => {
  it("says who leads on review sites, with the counts", () => {
    const rows = sourceBreakdown([check({ competitors: them, sites: ["yelp.com"] }), check({ sites: ["yelp.com"] })], "Bean House", null, null);
    expect(listingsArea(rows)).toEqual({ key: "listings", label: "Review sites and directories", lead: "them", detail: "In 2 answers that used them (yelp.com), AI named them in 1 and you in 0." });
    expect(listingsArea([]).lead).toBe("unknown");
  });

  it("compares AI quoting each website, and Google from your side", () => {
    expect(quotesArea(6, 3, "beanhouse.example", true)).toMatchObject({ lead: "them", detail: "AI used their website in 6 answers and yours in 3." });
    const g = googleArea({ rating: 4.7, reviewCount: 320, hours: null, categories: [] }, { rating: 4.2, reviewCount: 12, hours: null, categories: [] });
    expect(g).toEqual({ key: "google", label: "Google listing", lead: "them", detail: "320 reviews vs your 12, rated 4.7 vs 4.2." });
  });

  it("names what only each website shows, so your lead there is plain to see", () => {
    const base = { businessSchema: false, contactForm: false, reviews: false, faq: false, hours: false, words: 100, aiBlocked: [] };
    const a = websiteArea({ theirs: { ...base, faq: true }, yours: { ...base, reviews: true, hours: true }, servicesOnlyThem: 0, claimsOnlyThem: 0 });
    expect(a).toEqual({ key: "website", label: "The websites", lead: "you", detail: "Only theirs: an FAQ. Only yours: reviews, opening hours." });
    expect(websiteArea(null).lead).toBe("unknown");
  });
});

describe("pagesUsed", () => {
  it("counts the pages of one site AI cited, once per answer", () => {
    const checks = [
      check({ urls: ["https://www.beanhouse.example/menu/", "https://beanhouse.example/menu"] }),
      check({ urls: ["https://beanhouse.example/", "https://yelp.com/x"] }),
      check({ urls: ["https://beanhouse.example/menu?x=1"] }),
    ];
    expect(pagesUsed(checks, "beanhouse.example")).toEqual([
      { path: "/menu", answers: 2 },
      { path: "/", answers: 1 },
    ]);
  });
});
