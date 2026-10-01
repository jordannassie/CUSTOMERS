import { describe, expect, it } from "vitest";
import { generateOpportunities } from "./opportunity-engine";

const result = (mentioned: boolean, competitors: string[] = []) => ({
  business_mentioned: mentioned,
  competitors_mentioned: competitors.map((name) => ({ name })),
  cited_sources: [{ url: "https://elsewhere.example/page" }],
});

const all = (mentioned: number, total: number) =>
  generateOpportunities({
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
    expect(none.evidence).toBe("AI assistants mentioned Sunrise Coffee Bar in 0 of 36 questions customers ask (0%).");
    expect(none.description).not.toMatch(/most/);
    expect(all(5, 36)[0].title).toBe("AI assistants leave you out of most answers");
  });

  it("has nothing to copy for Claude when the fix is a settings task", () => {
    expect(all(0, 36).find((d) => d.category === "local_presence")?.claude_prompt).toBe("");
  });
});
