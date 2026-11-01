import { describe, expect, it } from "vitest";
import { competitorSiteOwner } from "./competitor-sites";

const OWN = "beantherecoffee.example";
const tracked = [
  { id: "c1", name: "Daily Grind", domain: "www.dailygrind.example", aliases: [] },
  { id: "c2", name: "Portola Coffee Roasters", domain: null, aliases: ["Portola Coffee"] },
  { id: "c3", name: "Social Cafe", domain: "facebook.com", aliases: [] },
];

describe("competitorSiteOwner", () => {
  it("matches a tracked competitor's website and its subdomains", () => {
    expect(competitorSiteOwner("dailygrind.example", OWN, tracked, [])).toEqual({ name: "Daily Grind", competitorId: "c1" });
    expect(competitorSiteOwner("order.dailygrind.example", OWN, tracked, [])).toEqual({ name: "Daily Grind", competitorId: "c1" });
    expect(competitorSiteOwner("notdailygrind.example", OWN, tracked, [])).toBeNull();
  });

  it("matches a tracked competitor by name or alias when we don't have its website", () => {
    expect(competitorSiteOwner("portolacoffee.com", OWN, tracked, [])).toEqual({ name: "Portola Coffee Roasters", competitorId: "c2" });
  });

  it("matches a business AI named, without a Compare link", () => {
    expect(competitorSiteOwner("jfcpizza.com", OWN, tracked, ["JFC Pizza"])).toEqual({ name: "JFC Pizza", competitorId: null });
    expect(competitorSiteOwner("bhaipizza.com", OWN, tracked, ["JFC Pizza"])).toBeNull();
  });

  it("never makes a listing, social or the business's own site a competitor site", () => {
    expect(competitorSiteOwner("facebook.com", OWN, tracked, [])).toBeNull();
    expect(competitorSiteOwner("yelp.com", OWN, tracked, ["Yelp"])).toBeNull();
    expect(competitorSiteOwner("beantherecoffee.example", OWN, tracked, ["Bean There Coffee"])).toBeNull();
  });
});
