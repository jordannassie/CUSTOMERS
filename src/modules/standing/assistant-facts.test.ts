import { describe, expect, it } from "vitest";
import { assistantFacts, shareMargin } from "./assistant-facts";
import type { StandingCheck } from "./checks";

const check = (over: Partial<StandingCheck>): StandingCheck =>
  ({ provider: "openai", questionId: "q", youNamed: false, competitors: ["Pizza Hut"], extracted: null, sites: [], ...over }) as StandingCheck;

describe("assistantFacts", () => {
  const checks = Array.from({ length: 10 }, (_, i) => check({ sites: i < 6 ? ["google.com"] : ["tiktok.com"], competitors: i < 8 ? ["Pizza Hut"] : [] }));
  const tally = [{ provider: "openai", assistant: "ChatGPT", answers: 10, them: 8, you: 0 }];

  it("names a tool that clearly prefers them, with the site it used most", () => {
    const [fact] = assistantFacts(checks, "Pizza Hut", "Pizza Hut", tally, null);
    expect(fact).toMatchObject({ title: "ChatGPT names them more", where: "google_listing", key: "google:listing", answers: 10 });
    expect(fact.action).toContain("Google");
  });

  it("says nothing when the gap is inside the margin, or with too few answers", () => {
    expect(assistantFacts(checks, "Pizza Hut", "Pizza Hut", [{ ...tally[0], them: 3, you: 2 }], null)).toEqual([]);
    expect(assistantFacts(checks, "Pizza Hut", "Pizza Hut", [{ ...tally[0], answers: 3 }], null)).toEqual([]);
  });

  it("has a margin that shrinks with more answers", () => {
    expect(shareMargin(2, 10)).toBeGreaterThan(shareMargin(20, 100));
  });
});
