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
    });
    expect(input.competitors.map((c) => [c.key, c.name, c.answersNamingThem])).toEqual([
      ["c1", "Bean House", 5],
      ["c2", "Daily Grind", 3],
    ]);
    expect(keys).toEqual({ c1: BEAN_HOUSE_ID, c2: DAILY_GRIND_ID });
  });

  it("gives Google values only as comparisons and placeholder names, never as numbers (D-73)", () => {
    expect(input.competitors[0].google).toEqual({ reviewCount: "more", rating: "higher", openDays: "more", sameCategory: true });
    expect(input.competitors[1].google).toMatchObject({ reviewCount: "more", sameCategory: false });
    expect(input.placeholders).toContain("{c1.review_count}");
    expect(input.placeholders).toContain("{you.rating}");
    const text = JSON.stringify(input);
    for (const n of COFFEE_PLACES_NUMBERS) expect(text).not.toContain(n);
  });

  it("lists cited sites without the business's own site, and how often the business was missing", () => {
    expect(input.citations.yourSiteCitedIn).toBe(1);
    expect(input.citations.sites[0]).toEqual({ domain: "yelp.com", answers: 4, answersWithoutYou: 3 });
    expect(input.citations.sites.map((s) => s.domain)).not.toContain("sunrise-coffee.example");
  });

  it("reads the business's own site facts without copying the phone or address", () => {
    expect(input.yourWebsite).toEqual({
      pagesRead: ["/", "/about"],
      pagesNotFound: ["/services"],
      hasPhone: false,
      hasAddress: true,
      servicesListed: ["espresso drinks", "pastries"],
    });
    expect(JSON.stringify(input)).not.toContain("120 Main St");
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
