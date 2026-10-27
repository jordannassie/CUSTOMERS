import { describe, expect, it } from "vitest";
import { SOURCE_TYPE_LABELS, SUB_KIND_LABELS, canBeBusinessSite, hostOf, isOwnSite, sourceType, subKind } from "./classify";

const OWN = "beantherecoffee.example";

describe("hostOf", () => {
  it("reads the host without www from full and bare addresses", () => {
    expect(hostOf("https://www.Yelp.com/biz/bean-there?x=1")).toBe("yelp.com");
    expect(hostOf("beantherecoffee.example/menu")).toBe("beantherecoffee.example");
  });

  it("rejects values that are not web addresses", () => {
    expect(hostOf("mailto:hi@example.com")).toBeNull();
    expect(hostOf("not a url")).toBeNull();
    expect(hostOf("localhost")).toBeNull();
    expect(hostOf("")).toBeNull();
  });
});

describe("isOwnSite", () => {
  it("matches the business's site and its subdomains only", () => {
    expect(isOwnSite("beantherecoffee.example", "https://www.beantherecoffee.example/")).toBe(true);
    expect(isOwnSite("shop.beantherecoffee.example", OWN)).toBe(true);
    expect(isOwnSite("notbeantherecoffee.example", OWN)).toBe(false);
    expect(isOwnSite("beantherecoffee.example", null)).toBe(false);
  });
});

describe("sourceType", () => {
  it.each([
    ["beantherecoffee.example", "own"],
    ["order.beantherecoffee.example", "own"],
    ["yelp.com", "reviews"],
    ["m.yelp.co.uk", "reviews"],
    ["reddit.com", "reviews"],
    ["tripadvisor.com", "reviews"],
    ["facebook.com", "reviews"],
    ["yellowpages.com", "directories"],
    ["bbb.org", "directories"],
    ["google.com", "directories"],
    ["maps.apple.com", "directories"],
    ["en.wikipedia.org", "directories"],
    ["doordash.com", "directories"],
    ["patch.com", "news"],
    ["la.eater.com", "news"],
    ["ocregister.com", "news"],
    ["sgvtribune.com", "news"],
    ["abc7news.com", "news"],
    ["orange-county-times.com", "news"],
    ["dailygrindcoffee.com", "business"],
    ["goodtimes-bar.com", "business"],
    ["portolacoffee.com", "business"],
  ] as const)("%s is %s", (host, type) => {
    expect(sourceType(host, OWN)).toBe(type);
  });

  it("does not match a brand inside a longer name", () => {
    expect(sourceType("yelp-reviews-helper.com", OWN)).toBe("business");
    expect(sourceType("angieslawncare.com", OWN)).toBe("business");
  });

  it("does not treat the top level domain as a brand", () => {
    expect(sourceType("mybakery.news", OWN)).toBe("business");
  });

  it("puts the business's own site first even when it looks like a listing", () => {
    expect(sourceType("yelp.com", "yelp.com")).toBe("own");
  });

  it("uses plain wording for every type (MVP_SPEC 8.4)", () => {
    expect(Object.values(SOURCE_TYPE_LABELS)).toEqual([
      "Your website",
      "Reviews and forums",
      "Directories",
      "News",
      "Business sites",
    ]);
  });
});

describe("subKind", () => {
  it.each([
    ["beantherecoffee.example", "own"],
    ["foodpanda.pk", "delivery"],
    ["doordash.com", "delivery"],
    ["ubereats.com", "delivery"],
    ["zomato.com", "delivery"],
    ["facebook.com", "social"],
    ["tiktok.com", "social"],
    ["m.youtube.com", "social"],
    ["yelp.com", "reviews"],
    ["tripadvisor.com", "reviews"],
    ["reddit.com", "reviews"],
    ["google.com", "directory"],
    ["yellowpages.com", "directory"],
    ["la.eater.com", "food_guide"],
    ["theinfatuation.com", "food_guide"],
    ["guide.michelin.com", "food_guide"],
    ["thecookbook.pk", "food_guide"],
    ["foodiespakistan.pk", "food_guide"],
    ["in.trip.com", "travel_guide"],
    ["lonelyplanet.com", "travel_guide"],
    ["wanderlog.com", "travel_guide"],
    ["visitorange.com", "travel_guide"],
    ["patch.com", "news"],
    ["ocregister.com", "news"],
    ["dailygrindcoffee.com", "business"],
    ["portolacoffee.com", "business"],
  ] as const)("%s is %s", (host, kind) => {
    expect(subKind(host, OWN)).toBe(kind);
  });

  it("makes a competitor's site a competitor site, before any name pattern", () => {
    expect(subKind("dailygrindcoffee.com", OWN, true)).toBe("competitor");
    expect(subKind("foodiepizza.com", OWN, true)).toBe("competitor");
  });

  it("never makes a listing or social site a competitor site", () => {
    expect(subKind("yelp.com", OWN, true)).toBe("reviews");
    expect(subKind("facebook.com", OWN, true)).toBe("social");
    expect(subKind("foodpanda.pk", OWN, true)).toBe("delivery");
  });

  it("uses plain wording for every kind (MVP_SPEC 8.4)", () => {
    expect(Object.values(SUB_KIND_LABELS)).toEqual([
      "Your website",
      "Delivery app",
      "Competitor site",
      "Food guide",
      "Social",
      "Reviews",
      "Directory",
      "Travel guide",
      "News",
      "Business site",
    ]);
  });
});

describe("canBeBusinessSite", () => {
  it("is true only for sites that could be another business's own website", () => {
    expect(canBeBusinessSite("dailygrindcoffee.com", OWN)).toBe(true);
    expect(canBeBusinessSite("thecookbook.pk", OWN)).toBe(true);
    expect(canBeBusinessSite("yelp.com", OWN)).toBe(false);
    expect(canBeBusinessSite("foodpanda.pk", OWN)).toBe(false);
    expect(canBeBusinessSite("in.trip.com", OWN)).toBe(false);
    expect(canBeBusinessSite("beantherecoffee.example", OWN)).toBe(false);
  });
});
