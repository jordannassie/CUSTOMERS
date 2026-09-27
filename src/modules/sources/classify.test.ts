import { describe, expect, it } from "vitest";
import { SOURCE_TYPE_LABELS, hostOf, isOwnSite, sourceType } from "./classify";

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
