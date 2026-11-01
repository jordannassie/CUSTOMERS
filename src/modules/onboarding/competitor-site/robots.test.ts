import { describe, expect, it } from "vitest";
import { aiBlocked } from "./robots";

describe("aiBlocked", () => {
  it("finds AI crawlers the whole site is closed to, a bot's own group winning over *", () => {
    const txt = "User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nUser-agent: PerplexityBot\nDisallow: /\n\nUser-agent: *\nAllow: /";
    expect(aiBlocked(txt)).toEqual(["GPTBot", "ClaudeBot", "PerplexityBot"]);
  });

  it("treats a site closed to everyone as closed to every AI crawler, unless one is let back in", () => {
    expect(aiBlocked("User-agent: *\nDisallow: /")).toHaveLength(6);
    expect(aiBlocked("User-agent: *\nDisallow: /\nUser-agent: GPTBot\nAllow: /")).not.toContain("GPTBot");
  });

  it("does not count a closed folder or comments as closing the site", () => {
    expect(aiBlocked("# Disallow: /\nUser-agent: *\nDisallow: /admin")).toEqual([]);
    expect(aiBlocked("")).toEqual([]);
  });
});
