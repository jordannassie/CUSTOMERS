import { describe, expect, it } from "vitest";
import type { Fact } from "@/modules/standing";
import { impactOf, mergeReasons, reasonCards, taskTitle } from "./cards";

const fact = (over: Partial<Fact>): Fact => ({ title: "t", detail: "d", text: "A fact.", where: "other_places", weight: 3, ...over });
const who = { id: "c1", name: "Bean House" };

describe("reasonCards", () => {
  it("turns a site reason into a fact with its count and a fix with where to apply it", () => {
    const [card] = reasonCards(
      [fact({ key: "site:yelp.com", answers: 9, weight: 9, action: "Claim or update your listing on yelp.com: same name, address and phone." })],
      who,
      "sunrise.example",
    );
    expect(card).toMatchObject({
      key: "site:yelp.com",
      tag: "Other places AI looks",
      basis: "Based on 9 answers",
      whereToApply: "yelp.com",
      impact: "high",
      answersHref: "/questions?site=yelp.com&named=Bean+House",
      action: { title: "Claim or update your listing on yelp.com", category: "citations" },
    });
  });

  it("says what a website or Google reason rests on, with no answers link", () => {
    const [web, google] = reasonCards(
      [
        fact({ key: "web:faq", where: "website", basis: "website", action: "Add an FAQ section." }),
        fact({ key: "google:reviews", where: "google_listing", basis: "google", action: "Ask for reviews." }),
      ],
      who,
      "sunrise.example",
    );
    expect(web).toMatchObject({ basis: "Based on the website check", answersHref: null, whereToApply: "sunrise.example, your website" });
    expect(google).toMatchObject({ basis: "Based on Google's listing", whereToApply: "Google Business Profile", action: { category: "reviews_reputation" } });
  });
});

describe("helpers", () => {
  it("ranks impact by the evidence weight, and keeps titles short", () => {
    expect([impactOf(6), impactOf(2.5), impactOf(1)]).toEqual(["high", "medium", "low"]);
    expect(taskTitle("Add an FAQ section to your website that answers the questions customers ask most.")).toBe(
      "Add an FAQ section to your website that answers the questions customers ask most",
    );
    expect(taskTitle("x ".repeat(80)).length).toBeLessThanOrEqual(93);
  });
});

describe("mergeReasons", () => {
  it("joins an AI tool's reason to the site reason with the same fix, so it is offered once", () => {
    const merged = mergeReasons([
      fact({ key: "site:yelp.com", text: "AI used yelp.com in 9 answers.", weight: 9 }),
      fact({ key: "site:yelp.com", assistant: "ChatGPT", title: "ChatGPT names them more", weight: 5 }),
      fact({ key: "site:yelp.com", assistant: "Claude", title: "Claude names them more", weight: 5 }),
      fact({ key: "ai:perplexity", assistant: "Perplexity", title: "Perplexity names them more", weight: 4 }),
    ]);
    expect(merged.map((f) => f.key)).toEqual(["site:yelp.com", "ai:perplexity"]);
    expect(merged[0].text).toBe("AI used yelp.com in 9 answers. ChatGPT and Claude name them more and used yelp.com most in those answers.");
  });
});
