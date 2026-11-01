import { describe, expect, it } from "vitest";
import { cheeziousSnapshot } from "./fixtures/cheezious";
import { BANNED, LONG_DASHES, strings } from "./report.test-helpers";
import { reportSnapshotSchema } from "./snapshot-schema";

describe("the Cheezious fixture", () => {
  it("parses as a version 2 snapshot", () => {
    expect(reportSnapshotSchema.safeParse(cheeziousSnapshot).success).toBe(true);
  });

  it("has one set of numbers", () => {
    const s = cheeziousSnapshot;
    expect(s.score.value).toBe(Math.round((100 * s.named.answers) / s.named.total));
    expect(s.coverage.answers).toBe(s.named.total);
    const you = s.businesses.find((b) => b.isYou)!;
    expect(you.mentions).toBe(s.named.answers);
    const picks = s.businesses.reduce((sum, b) => sum + b.mentions, 0);
    expect(s.shareOfPicks).toBe(Math.round((100 * you.mentions) / picks));
    expect(s.fixes.map((f) => f.n)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const g of s.knows.gaps) expect(s.fixes.some((f) => f.n === g.fix)).toBe(true);
  });

  it("follows the wording rules", () => {
    expect(strings(cheeziousSnapshot).filter((t) => LONG_DASHES.test(t) || BANNED.test(t))).toEqual([]);
  });
});
