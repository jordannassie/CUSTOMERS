import { describe, expect, it } from "vitest";
import { dropFirst, switcherScore, type SwitcherScore } from "./scores";

const tone = (n: number) => (n >= 70 ? "good" : n >= 40 ? "mid" : "low") as const;

describe("switcherScore", () => {
  it("rounds the score and change and dates the last scan", () => {
    const report = {
      overall: { score: 61.6 },
      change: { direction: "down" as const, points: 6.4 },
      lastCheckedAt: new Date("2026-09-28T10:00:00Z"),
    };
    expect(switcherScore(report, tone)).toEqual({
      score: 62,
      tone: "mid",
      change: { direction: "down", points: 6 },
      lastScan: "Last scan Sep 28",
    });
  });

  it("has no score or change before a scan", () => {
    expect(switcherScore({ overall: null, change: null, lastCheckedAt: null }, tone)).toEqual({
      score: null,
      tone: null,
      change: null,
      lastScan: "No scans yet",
    });
  });
});

describe("dropFirst", () => {
  const s = (change: SwitcherScore["change"]): SwitcherScore => ({ score: 50, tone: "mid", change, lastScan: "" });

  it("puts the biggest drop first and keeps the rest in order", () => {
    const byId = {
      a: s({ direction: "up", points: 9 }),
      b: s({ direction: "down", points: 3 }),
      c: s(null),
      d: s({ direction: "down", points: 8 }),
    };
    expect(dropFirst(["a", "b", "c", "d", "e"], byId)).toEqual(["d", "b", "a", "c", "e"]);
  });
});
