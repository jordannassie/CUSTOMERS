import { describe, expect, it } from "vitest";
import { generateOpportunities } from "./opportunity-engine";

const result = (mentioned: boolean, competitors: string[] = []) => ({
  business_mentioned: mentioned,
  competitors_mentioned: competitors.map((name) => ({ name })),
  cited_sources: [{ url: "https://elsewhere.example/page" }],
});

const all = (mentioned: number, total: number, site: { hasWebsite?: boolean; websiteRead?: boolean } = {}) =>
  generateOpportunities({
    ...site,
    businessName: "Sunrise Coffee Bar",
    domain: "sunrise.example",
    description: null,
    primaryCity: null,
    results: Array.from({ length: total }, (_, i) => result(i < mentioned, ["Rival Roasters"])),
    seo: {
      keywordGaps: [{ keyword: "coffee near me", competitorDomain: "rival.example", competitorPosition: 2, searchVolume: 900 }],
      topKeywords: [{ keyword: "espresso bar", position: 12, searchVolume: 300 }],
    },
  });

// MVP_SPEC 8.4 "Do not show" terms, and the WRITING.md long dashes and hyphenated ranges.
const NOT_SHOWN = /buyer[- ]intent|structured data|share of voice|citation rate|\b(GEO|AEO|LLMs?|UGC)\b|[\u2013\u2014]|\d-\d/i;

describe("rules fallback wording (BUG-A)", () => {
  it("shows no MVP_SPEC 8.4 terms on any opportunity a user can see", () => {
    const drafts = all(1, 36);
    expect(drafts.map((d) => d.category)).toEqual([
      "content",
      "citations",
      "competitor_gap",
      "entity_consistency",
      "local_presence",
      "content",
      "content",
    ]);
    for (const d of drafts) {
      for (const text of [d.title, d.description, d.evidence, d.recommended_action, d.claude_prompt]) {
        expect(text).not.toMatch(NOT_SHOWN);
      }
    }
  });

  it("says plainly when AI never mentioned the business", () => {
    const [none] = all(0, 36);
    expect(none.title).toBe("AI assistants don't mention you yet");
    expect(none.evidence).toBe("AI assistants mentioned Sunrise Coffee Bar in 0 of 36 answers to customer questions (0%).");
    expect(none.description).not.toMatch(/most/);
    expect(all(5, 36)[0].title).toBe("AI assistants leave you out of most answers");
  });

  it("has nothing to copy for Claude when the fix is a settings task", () => {
    expect(all(0, 36).find((d) => d.category === "local_presence")?.claude_prompt).toBe("");
  });
});

describe("rules fallback does not guess (2026-10-28)", () => {
  const description = (site: { hasWebsite?: boolean; websiteRead?: boolean }) => all(1, 36, site).find((d) => d.category === "entity_consistency")!;

  it("says the website check found no description only when it read the site", () => {
    expect(description({ websiteRead: true }).evidence).toBe("There is no business description on file, and our check of your website didn't find one either.");
    expect(description({ websiteRead: false }).evidence).toBe("There is no business description on file.");
    expect(description({}).evidence).toBe("There is no business description on file.");
  });

  it("gives a business with no website no website steps and nothing to copy for Claude", () => {
    const drafts = all(1, 36, { hasWebsite: false });
    for (const d of drafts) expect(d.claude_prompt).toBe("");
    expect(drafts.map((d) => d.category)).not.toContain("citations");
    expect(description({ hasWebsite: false }).recommended_action).toContain("Google Business Profile");
    expect(drafts[0].recommended_action).toMatch(/^Fill in your Google Business Profile/);
    for (const d of drafts) expect(d.recommended_action).not.toMatch(/your website|homepage/i);
    expect(all(1, 36).filter((d) => d.claude_prompt).length).toBeGreaterThan(0);
  });

  it("names the next step for a competitor gap instead of saying look at them", () => {
    const gap = all(1, 36).find((d) => d.category === "competitor_gap")!;
    expect(gap.recommended_action).toMatch(/^On the Questions page, open the questions where AI names Rival Roasters\./);
    expect(gap.recommended_action).not.toMatch(/\blook at\b/i);
  });
});
