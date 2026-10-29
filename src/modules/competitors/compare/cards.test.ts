import { describe, expect, it } from "vitest";
import type { Fact } from "@/modules/standing";
import { googleReasonCards, impactOf, mergeReasons, reasonCards, taskTitle } from "./cards";

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
      tag: "Other places",
      basis: "Based on 9 answers",
      whereToApply: "yelp.com",
      impact: "high",
      answersHref: "/questions?site=yelp.com&named=Bean+House",
      action: { title: "Claim or update your listing on yelp.com", category: "citations" },
    });
  });

  it("carries the saved fix a reason is tied to, with its status, and none when that fix is not open", () => {
    const reasons = [fact({ key: "site:yelp.com", fixId: "f1" }), fact({ key: "web:faq", where: "website", fixId: "gone" }), fact({ key: "ai:x" })];
    const cards = reasonCards(reasons, who, null, [{ id: "f1", status: "open" }]);
    expect(cards.map((c) => c.fix)).toEqual([{ id: "f1", status: "open" }, null, null]);
    expect(reasonCards(reasons, who, null).every((c) => c.fix === null)).toBe(true);
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

describe("default step", () => {
  it("names the next action for a reason with no step of its own, with the answers that name them linked", () => {
    const [card] = reasonCards([fact({ key: "ai:chatgpt", assistant: "ChatGPT", where: null })], who, null);
    expect(card.whatToDo).toMatch(/^Open the questions where AI names Bean House\. Note the facts/);
    expect(card.whatToDo).not.toMatch(/look at/i);
    expect(card.action.title).toBe("Open the questions where AI names Bean House");
    expect(card.answersHref).toBe("/questions?named=Bean+House");
  });
});

describe("helpers", () => {
  it("ranks impact by the evidence weight, and keeps titles short", () => {
    expect([impactOf(6), impactOf(2.5), impactOf(1)]).toEqual(["high", "medium", "low"]);
    expect(taskTitle("Add an FAQ section to your website that answers the questions customers ask most.")).toBe(
      "Add an FAQ section to your website that answers the questions customers ask most",
    );
    expect(taskTitle("x ".repeat(80)).length).toBeLessThanOrEqual(90);
    // A long step is cut at a word, with no ellipsis and no dangling "and" (WRITING.md).
    const long = taskTitle(
      "Open the questions where AI names Bean House and note the facts those answers give about them, then add the same facts about you",
    );
    expect(long).toBe("Open the questions where AI names Bean House and note the facts those answers give about");
    expect(long).not.toMatch(/\.\.\.|…/);
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

describe("googleReasonCards", () => {
  const reviews = fact({ key: "google:reviews", where: "google_listing", match: ["review"], basis: "google", title: "More Google reviews" });

  it("ties a Google reason to the scan's saved fix, so Add to Actions never saves a second copy", () => {
    const fixes = [{ id: "f1", where: "google_listing" as const, text: "ask your customers for google reviews", status: "open" }];
    const [card] = googleReasonCards([reviews], who, fixes);
    expect(card.fix).toEqual({ id: "f1", status: "open" });
    expect(card.answersHref).toBeNull();
  });

  it("leaves a Google reason with no matching fix free to add", () => {
    const fixes = [{ id: "f2", where: "website" as const, text: "add a menu page", status: "todo" }];
    expect(googleReasonCards([reviews], who, fixes)[0].fix).toBeNull();
  });
});
