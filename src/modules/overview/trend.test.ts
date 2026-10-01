import { describe, expect, it } from "vitest";
import { historyChange, trendView } from "./trend";

const NOW = new Date("2026-10-01T12:00:00Z");
const scan = (date: string, score: number, margin = 6) => ({ date, score, margin });

describe("trendView", () => {
  it("draws one point per scan with its band, the change and the next scan (DB-002)", () => {
    const view = trendView({
      history: [scan("2026-09-02", 52.6, 8), scan("2026-09-09", 55), scan("2026-10-01", 61.6, 4)],
      nextScanAt: new Date("2026-10-08T09:00:00Z"),
      now: NOW,
    });
    expect(view.summary).toBeNull();
    expect(view.points[0]).toEqual({ date: "2026-09-02", label: "Sep 2", score: 53, margin: 8, band: [45, 61] });
    expect(view.change).toEqual({ direction: "up", text: "Up 9 points since Sep 2" });
    expect(view.caption).toBe("Each dot is one scan. The shaded band is how far the score could be off. Next scan Oct 8.");
  });

  it("keeps the band inside 0 to 100", () => {
    const view = trendView({ history: [scan("2026-09-24", 3, 9), scan("2026-10-01", 96, 9)], nextScanAt: null, now: NOW });
    expect(view.points.map((p) => p.band)).toEqual([
      [0, 12],
      [87, 100],
    ]);
  });

  it("says one scan in words, with the next scan, and leaves out a next scan that is not coming (DB-001)", () => {
    expect(trendView({ history: [scan("2026-10-01", 66.7)], nextScanAt: new Date("2026-10-08T00:00:00Z"), now: NOW }).summary).toBe(
      "1 scan in the last 90 days: 67. Next scan Oct 8.",
    );
    expect(trendView({ history: [scan("2026-10-01", 0)], nextScanAt: null, now: NOW }).summary).toBe("1 scan in the last 90 days: 0.");
  });
});

describe("historyChange", () => {
  it("is null when the first and last scan are within their margins", () => {
    expect(historyChange([scan("2026-09-02", 55, 8), scan("2026-10-01", 60, 8)])).toBeNull();
    expect(historyChange([scan("2026-09-02", 70, 3), scan("2026-10-01", 50, 3)])).toEqual({
      direction: "down",
      text: "Down 20 points since Sep 2",
    });
  });
});
