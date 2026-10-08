import { describe, expect, it } from "vitest";
import { websiteIssues } from "./claims";
import { buildExplainInput } from "./facts";
import { COFFEE_SOURCES } from "./fixtures";
import { templateWriter } from "./template-writer";
import { yourWebsite } from "./your-website";

// Khaadi (BUG-087): khaadi.com turned our reader away, and the advice said to build a one-page website.
const blockedPages = { pages: [{ path: "/", status: "blocked" }, { path: "/about", status: "blocked" }], facts: null };

describe("a website we could not read (BUG-087)", () => {
  it("tells blocked from did not load, and never claims what the site lacks", () => {
    expect(yourWebsite(blockedPages)).toMatchObject({ readStatus: "blocked", hasPhone: null, hasAddress: null });
    expect(yourWebsite({ pages: [{ path: "/", status: "failed" }], facts: null })?.readStatus).toBe("unreachable");
    expect(yourWebsite(null)).toBeNull();
  });

  it("gives advice to let AI readers in, not to build a website", async () => {
    for (const siteFacts of [blockedPages, null]) {
      const { input } = buildExplainInput({ ...COFFEE_SOURCES, siteFacts });
      const { output } = await templateWriter(input);
      const text = JSON.stringify(output);
      expect(text).not.toMatch(/one-page website|create a simple/i);
      expect(text).toMatch(/GPTBot, ClaudeBot and PerplexityBot/);
    }
  });

  it("drops a written reason that tells a business with a website to build one", () => {
    const { input } = buildExplainInput({ ...COFFEE_SOURCES, siteFacts: blockedPages });
    expect(websiteIssues(["Create a simple one-page website with your services."], input)).toEqual([
      "tells a business with a website to build one",
    ]);
    expect(websiteIssues(["Allow GPTBot in your robots.txt."], input)).toEqual([]);
    const noSite = { ...input, business: { ...input.business, hasWebsite: false } };
    expect(websiteIssues(["Create a simple one-page website."], noSite)).toEqual([]);
  });
});
