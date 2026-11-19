import { describe, expect, it } from "vitest";
import type { Analysis } from "./analysis";
import { headline } from "./summary";

const analysis = (named: number, rivals: { name: string; mentions: number }[]) =>
  ({ name: "Orange Florist", named, total: 72, rivals }) as unknown as Analysis;

describe("report headline (MVP test, 2026-11-14)", () => {
  it("never claims a lead when nobody was named", () => {
    expect(headline(analysis(0, [{ name: "Bloom", mentions: 0 }]))).toBe(
      "AI named Orange Florist in 0 of 72 answers. AI did not name any business you track either.",
    );
  });

  it("still says you lead when you were named more than every competitor", () => {
    expect(headline(analysis(5, [{ name: "Bloom", mentions: 2 }]))).toBe(
      "AI named Orange Florist in 5 of 72 answers. That is more than any business you track.",
    );
  });

  it("names the competitor AI picked more often", () => {
    expect(headline(analysis(1, [{ name: "Bloom", mentions: 4 }]))).toBe("AI named Orange Florist in 1 of 72 answers. Bloom was named in 4.");
  });
});
