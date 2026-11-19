import { describe, expect, it } from "vitest";
import { firstIssue, newsArticleInput, newsSearchInput } from "./schema";

describe("LinkedIn studio input (admin audit 2026-11-12)", () => {
  it("keeps the old defaults for a bad or missing period and weekday", () => {
    expect(newsSearchInput.parse({})).toEqual({ period: "24h", weekday: "monday" });
    expect(newsSearchInput.parse({ period: "1y", weekday: "sunday" })).toEqual({ period: "24h", weekday: "monday" });
    expect(newsSearchInput.parse({ period: "7d", weekday: "friday" })).toEqual({ period: "7d", weekday: "friday" });
  });

  it("trims text, empties non-text, and defaults the category", () => {
    const parsed = newsArticleInput.parse({ headline: "  New AI mode  ", whatIsNew: 42 });
    expect(parsed).toMatchObject({ headline: "New AI mode", whatIsNew: "", category: "AI Search", weekday: "monday" });
  });

  it("needs a headline and refuses text that is too long", () => {
    const missing = newsArticleInput.safeParse({ headline: "   " });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(firstIssue(missing.error)).toBe("Headline is required.");
    const long = newsArticleInput.safeParse({ headline: "Ok", whatIsNew: "x".repeat(2_001) });
    expect(long.success).toBe(false);
    if (!long.success) expect(firstIssue(long.error)).toContain("2,000 characters");
  });
});
