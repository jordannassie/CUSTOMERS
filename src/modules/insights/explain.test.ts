import { describe, expect, it } from "vitest";
import { explain, type WriteExplanation } from "./explain";
import { BEAN_HOUSE_ID, COFFEE_PLACES_NUMBERS, COFFEE_SOURCES, PLUMBER_SOURCES } from "./fixtures";
import type { ExplainReason } from "./prompts/explain.v1";
import { templateWriter } from "./template-writer";

const storedText = (d: { title: string; description: string; evidence: string; recommended_action: string; claude_prompt: string | null }) =>
  [d.title, d.description, d.evidence, d.recommended_action, d.claude_prompt ?? ""].join("\n");

const reason = (over: Partial<ExplainReason>): ExplainReason => ({
  title: "Bean House is named more often",
  evidence: "Bean House was named in 5 of 6 answers.",
  why_it_matters: "AI repeats the businesses it sees most.",
  steps: ["Ask for reviews.", "Reply to reviews."],
  impact: "high",
  category: "competitor_gap",
  fix_on_website: false,
  copy_for_claude: "",
  ...over,
});

describe("explain", () => {
  it("turns 3 to 5 reasons into opportunities that keep Google values as placeholders (D-73)", async () => {
    const result = await explain(COFFEE_SOURCES, templateWriter);
    expect(result).toMatchObject({ source: "ai", dropped: [], fallbackReason: null });
    expect(result.drafts.length).toBeGreaterThanOrEqual(3);
    expect(result.drafts.length).toBeLessThanOrEqual(5);
    const reviews = result.drafts[0];
    expect(reviews.title).toBe("Bean House has more Google reviews than you");
    expect(reviews.evidence).toContain(`{competitor.${BEAN_HOUSE_ID}.review_count}`);
    expect(reviews.evidence).toContain("{business.review_count}");
    expect(reviews.recommended_action).toMatch(/^1\. /);
    for (const d of result.drafts) for (const n of COFFEE_PLACES_NUMBERS) expect(storedText(d)).not.toContain(n);
    const website = result.drafts.find((d) => d.category === "service_page");
    expect(website?.claude_prompt).toContain("Sunrise Coffee Bar (sunrise-coffee.example)");
    // The fixture site has no phone number, so the title says that too (BUG-030).
    expect(website?.title).toBe("Your website does not show your phone number");
    expect(website?.evidence).toBe("We read your website and did not find your phone number.");
  });

  it("drops reasons with invented facts, and uses the rules when fewer than 3 are left", async () => {
    const write: WriteExplanation = async () => ({
      model: "claude-sonnet-5",
      usage: { inputTokens: 1000, outputTokens: 500 },
      output: {
        reasons: [
          reason({}),
          reason({ title: "Reviews", evidence: "Bean House has 320 reviews." }),
          reason({ title: "Yellow pages", steps: ["List on yellowpages.com.", "Check it."] }),
        ],
      },
    });
    const result = await explain(COFFEE_SOURCES, write);
    expect(result.source).toBe("rules");
    expect(result.fallbackReason).toBe("only 1 of 3 reasons passed the checks");
    expect(result.dropped.map((d) => d.title)).toEqual(["Reviews", "Yellow pages"]);
    expect(result.usage).toEqual({ inputTokens: 1000, outputTokens: 500 });
    expect(result.drafts.length).toBeGreaterThan(0);
  });

  it("keeps at most 5 reasons", async () => {
    const write: WriteExplanation = async () => ({
      model: "claude-sonnet-5",
      usage: null,
      output: { reasons: [1, 2, 3, 4, 5, 6].map((i) => reason({ title: `Reason ${"abcdef"[i - 1]}` })) },
    });
    expect((await explain(COFFEE_SOURCES, write)).drafts).toHaveLength(5);
  });

  it("falls back to the rules when Claude fails, is not set up, or the scan saved nothing", async () => {
    const failing: WriteExplanation = async () => {
      throw new Error("503");
    };
    expect(await explain(COFFEE_SOURCES, failing)).toMatchObject({ source: "rules", fallbackReason: "writer failed: 503" });
    expect(await explain(COFFEE_SOURCES, null)).toMatchObject({ source: "rules" });
    expect(await explain({ ...COFFEE_SOURCES, checks: [] }, templateWriter)).toMatchObject({ source: "rules", drafts: [] });
  });

  it("rules name only tracked competitors and follow the writing guide", async () => {
    const { drafts } = await explain(COFFEE_SOURCES, null);
    expect(drafts.map((d) => d.title)).toContain("AI assistants pick Bean House more often than you");
    for (const d of drafts) expect(storedText(d)).not.toMatch(/[\u2013\u2014]/);
  });

  it("works for a business with no website and no Google place", async () => {
    const result = await explain(PLUMBER_SOURCES, templateWriter);
    expect(result.source).toBe("ai");
    expect(result.drafts.map((d) => d.category)).toContain("local_presence");
    for (const d of result.drafts) expect(storedText(d)).not.toMatch(/\{/);
  });
});
