import { describe, expect, it } from "vitest";
import { answerSiteFix } from "./answer-fix";

const ctx = { ownDomain: "sunrise.example", place: "Springfield, IL", label: "ChatGPT", question: "Best coffee in Springfield?", named: ["Bean House"] };

describe("answerSiteFix", () => {
  it("offers the same fix Sources saves for a site the answer used, under the same key", () => {
    expect(answerSiteFix(["yelp.com"], ctx)).toMatchObject({
      title: "Get listed on yelp.com",
      whereToApply: "yelp.com",
      dedupeKey: "site:yelp.com",
      source: "sources",
      category: "reviews_reputation",
      fact: 'ChatGPT used yelp.com for "Best coffee in Springfield?" and named Bean House, not you.',
    });
  });

  it("skips your own site and sites you can't get listed on, and says Google Business Profile for Google", () => {
    expect(answerSiteFix(["sunrise.example", "maps.google.com"], ctx)).toMatchObject({ title: "Complete your Google Business Profile", whereToApply: "Google Business Profile" });
    expect(answerSiteFix(["sunrise.example"], ctx)).toBeNull();
    expect(answerSiteFix([], ctx)).toBeNull();
  });
});
