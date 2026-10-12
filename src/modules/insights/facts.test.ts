import { describe, expect, it } from "vitest";
import { buildExplainInput } from "./facts";
import { BEAN_HOUSE_ID, COFFEE_PLACES_NUMBERS, COFFEE_SOURCES, DAILY_GRIND_ID, PLUMBER_SOURCES } from "./fixtures";

describe("buildExplainInput", () => {
  const { input, keys } = buildExplainInput(COFFEE_SOURCES);

  it("counts answers per assistant and per competitor from the scan", () => {
    expect(input.scan).toEqual({
      answers: 6,
      answersNamingYou: 1,
      byAssistant: [
        { assistant: "ChatGPT", answers: 2, answersNamingYou: 0 },
        { assistant: "Claude", answers: 2, answersNamingYou: 0 },
        { assistant: "Perplexity", answers: 2, answersNamingYou: 1 },
      ],
      assistantsNotChecked: [],
    });
    expect(input.competitors.map((c) => [c.key, c.name, c.answersNamingThem])).toEqual([
      ["c1", "Bean House", 5],
      ["c2", "Daily Grind", 3],
    ]);
    expect(keys).toEqual({ c1: BEAN_HOUSE_ID, c2: DAILY_GRIND_ID });
  });

  it("names an assistant that was asked but has no answers, instead of dropping it (BUG-077)", () => {
    const withoutClaude = { ...COFFEE_SOURCES, models: ["openai", "anthropic", "perplexity"], checks: COFFEE_SOURCES.checks.filter((c) => c.provider !== "anthropic") };
    const { input: scan } = buildExplainInput(withoutClaude);
    expect(scan.scan.assistantsNotChecked).toEqual(["Claude"]);
    expect(scan.scan.byAssistant.map((a) => a.assistant)).toEqual(["ChatGPT", "Perplexity"]);
  });

  it("gives Google values only as comparisons and placeholder names, never as numbers (D-73)", () => {
    expect(input.competitors[0].google).toEqual({
      reviewCount: "they_are_ahead",
      rating: "they_are_ahead",
      openDays: "they_are_ahead",
      sameCategory: true,
    });
    expect(input.competitors[1].google).toMatchObject({ reviewCount: "they_are_ahead", sameCategory: false });
    expect(input.placeholders).toContain("{c1.review_count}");
    expect(input.placeholders).toContain("{you.rating}");
    const text = JSON.stringify(input);
    for (const n of COFFEE_PLACES_NUMBERS) expect(text).not.toContain(n);
  });

  it("lists cited sites without the business's own site, and how often the business was missing", () => {
    expect(input.citations.yourSiteCitedIn).toBe(1);
    expect(input.citations.sites[0]).toEqual({ domain: "yelp.com", kind: "listing", owner: null, answers: 4, answersWithoutYou: 3 });
    expect(input.citations.sites.map((s) => s.domain)).not.toContain("sunrise-coffee.example");
  });

  it("says from the owner's side when the business is ahead on Google (BUG-099)", () => {
    const signals = new Map(COFFEE_SOURCES.signals);
    signals.set("ChIJ-fixture-sunrise-coffee", { rating: 4.9, reviewCount: 900, categories: ["Coffee shop"], hours: null });
    const { input: ahead } = buildExplainInput({ ...COFFEE_SOURCES, signals });
    expect(ahead.competitors[0].google).toMatchObject({ reviewCount: "you_are_ahead", rating: "you_are_ahead", openDays: "unknown" });
  });

  it("marks which cited sites can hold a listing and whose own website the others are (BUG-100)", () => {
    const sources = {
      ...COFFEE_SOURCES,
      checks: COFFEE_SOURCES.checks.map((c) => ({
        ...c,
        citations: [{ url: "https://www.yelp.com/x" }, { url: "https://beanhouse.example/menu" }, { url: "https://www.statesman.com/food" }],
      })),
    };
    const sites = buildExplainInput(sources).input.citations.sites.map(({ domain, kind, owner }) => ({ domain, kind, owner }));
    expect(sites).toEqual([
      { domain: "beanhouse.example", kind: "business_site", owner: "Bean House" },
      { domain: "statesman.com", kind: "news", owner: null },
      { domain: "yelp.com", kind: "listing", owner: null },
    ]);
  });

  it("reads the business's own site facts without copying the phone or address", () => {
    expect(input.yourWebsite).toEqual({
      readStatus: "read",
      pagesRead: ["/", "/about"],
      hasPhone: false,
      hasAddress: true,
      servicesListed: ["espresso drinks", "pastries"],
    });
    expect(JSON.stringify(input)).not.toContain("120 Main St");
    // We only open a few paths: /services not being one of them says nothing about the site (BUG-115).
    expect(JSON.stringify(input.yourWebsite)).not.toContain("/services");
  });

  it("lists the questions the business missed most", () => {
    expect(input.questions[0]).toEqual({
      question: "Where can I get oat milk lattes in Springfield, IL?",
      answers: 3,
      answersNamingYou: 0,
      competitorsNamed: ["Daily Grind", "Bean House"],
    });
  });

  it("offers no placeholders when Google has nothing", () => {
    const plumber = buildExplainInput(PLUMBER_SOURCES).input;
    expect(plumber.placeholders).toEqual([]);
    expect(plumber.competitors[0].google).toBeNull();
    expect(plumber.yourWebsite).toBeNull();
  });
});
