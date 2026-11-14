import { describe, expect, it } from "vitest";
import { effectText } from "./ActionEffectNote";

describe("effectText (B-98)", () => {
  it("promises the measure until the scans have run", () => {
    expect(effectText(null)).toBe("We will measure the effect over your next 2 scans.");
    expect(effectText({ state: "waiting", scansSince: 0, scansNeeded: 2 })).toBe("We will measure the effect over your next 2 scans.");
    expect(effectText({ state: "waiting", scansSince: 1, scansNeeded: 2 })).toBe("1 of 2 scans done since. The change shows after the next scan.");
  });

  it("says what changed since, never that the action caused it", () => {
    const up = effectText({ state: "measured", before: { named: 1, total: 12 }, after: { named: 3, total: 12 }, change: "up" });
    expect(up).toBe("Since you marked this done, AI named you in 3 of 12 answers, up from 1 of 12 answers in the 30 days before.");
    expect(up).not.toMatch(/because/i);
    expect(effectText({ state: "measured", before: { named: 2, total: 12 }, after: { named: 1, total: 12 }, change: "down" })).toContain("down from 2 of 12 answers");
    expect(effectText({ state: "measured", before: { named: 1, total: 12 }, after: { named: 1, total: 12 }, change: "same" })).toContain("about the same as 1 of 12 answers");
  });

  it("is honest when there was nothing before to compare with", () => {
    expect(effectText({ state: "measured", before: null, after: { named: 0, total: 1 }, change: "same" })).toBe(
      "Since you marked this done, AI named you in 0 of 1 answer. There were no answers in the 30 days before to compare.",
    );
  });
});
