import { describe, expect, it } from "vitest";
import { citedText, donutSegments, dotScale, skippedText } from "./StatCards";

describe("dotScale (Answers that named you dots)", () => {
  it("draws one dot per answer up to 60", () => {
    expect(dotScale(5, 36)).toEqual({ per: 1, dots: 36, filled: 5 });
    expect(dotScale(0, 60)).toEqual({ per: 1, dots: 60, filled: 0 });
  });

  it("past 60 makes each dot ceil(total / 60) answers", () => {
    expect(dotScale(26, 180)).toEqual({ per: 3, dots: 60, filled: 9 });
    expect(dotScale(1, 500)).toEqual({ per: 9, dots: 56, filled: 1 });
  });

  it("has no dots without answers", () => {
    expect(dotScale(0, 0)).toEqual({ per: 1, dots: 0, filled: 0 });
  });
});

describe("the lines under the numbers", () => {
  it("says how many answers skipped you, or that none named you", () => {
    expect(skippedText(26, 180)).toBe("154 answers skipped you");
    expect(skippedText(1, 2)).toBe("1 answer skipped you");
    expect(skippedText(0, 40)).toBe("Not named in any answer yet");
  });

  it("says how far behind rivals' sites, not cited yet, or ahead", () => {
    expect(citedText(2, 60)).toBe("30x behind rivals");
    expect(citedText(0, 25)).toBe("Not cited yet");
    expect(citedText(0, 0)).toBe("Not cited yet");
    expect(citedText(9, 9)).toBe("Ahead of rivals");
    expect(citedText(12, 4)).toBe("Ahead of rivals");
  });
});

describe("donutSegments (Share of AI picks donut)", () => {
  const part = (name: string, percent: number, isYou = false) => ({ name, percent, isYou, color: "x" });

  it("splits the circle by share, in order, leaving out zero shares", () => {
    const segs = donutSegments([part("A", 50), part("You", 25, true), part("B", 25), part("C", 0)]);
    expect(segs.map((s) => s.part.name)).toEqual(["A", "You", "B"]);
    const c = 2 * Math.PI * 20;
    expect(segs[1].offset).toBeCloseTo(c / 2);
    expect(segs[0].length).toBeLessThan(c / 2);
  });

  it("draws nothing when no one has a share, so only the grey track shows", () => {
    expect(donutSegments([part("You", 0, true)])).toEqual([]);
    expect(donutSegments([])).toEqual([]);
  });
});
