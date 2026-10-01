import { describe, expect, it } from "vitest";
import { scanChangeText, trendView } from "./trend";

const NOW = new Date("2026-10-01T12:00:00Z");
const day = (date: string, score: number | null) => ({ date, score, checks: score === null ? 0 : 36 });
const week = (scores: Record<string, number>) =>
  ["2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"].map((d) =>
    day(d, scores[d] ?? null),
  );

describe("trendView", () => {
  it("says one scan in words, with the change and the next scan", () => {
    const view = trendView({
      trend: week({ "2026-10-01": 61.6 }),
      scans: [
        { date: "2026-09-24", score: 40, margin: 6 },
        { date: "2026-10-01", score: 61.6, margin: 6 },
      ],
      nextScanAt: new Date("2026-10-08T09:00:00Z"),
      now: NOW,
    });
    expect(view.summary).toBe("1 scan this week: 62. Up 22 points on the Sep 24 scan. Next scan Oct 8.");
  });

  it("leaves out a change inside the margin and a next scan that is not coming", () => {
    const view = trendView({
      trend: week({ "2026-10-01": 0 }),
      scans: [
        { date: "2026-09-24", score: 8, margin: 10 },
        { date: "2026-10-01", score: 0, margin: 10 },
      ],
      nextScanAt: null,
      now: NOW,
    });
    expect(view.summary).toBe("1 scan this week: 0.");
  });

  it("says when the week had no scan", () => {
    const view = trendView({ trend: week({}), scans: [], nextScanAt: new Date("2026-10-02T00:00:00Z"), now: NOW });
    expect(view).toEqual({ points: [], summary: "No scans this week. Next scan Oct 2." });
  });

  it("draws the chart from 2 scans, labelled with their dates", () => {
    const view = trendView({
      trend: week({ "2026-09-28": 57.8, "2026-10-01": 62.2 }),
      scans: [],
      nextScanAt: null,
      now: NOW,
    });
    expect(view).toEqual({
      points: [
        { date: "2026-09-28", label: "Sep 28", score: 58 },
        { date: "2026-10-01", label: "Oct 1", score: 62 },
      ],
      summary: null,
    });
  });
});

describe("scanChangeText", () => {
  it("compares the last two scans", () => {
    expect(
      scanChangeText([
        { date: "2026-09-17", score: 90, margin: 1 },
        { date: "2026-09-24", score: 70, margin: 4 },
        { date: "2026-10-01", score: 59, margin: 4 },
      ]),
    ).toBe("Down 11 points on the Sep 24 scan.");
    expect(scanChangeText([{ date: "2026-10-01", score: 59, margin: 4 }])).toBeNull();
  });
});
