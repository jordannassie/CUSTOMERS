import { describe, expect, it } from "vitest";
import { questionHistory, trendOf, type HistoryRow } from "./history";

const NOW = new Date("2026-10-27T12:00:00Z");
const daysAgo = (d: number, h = 0) => new Date(NOW.getTime() - d * 86_400_000 - h * 3_600_000);
const row = (runId: string, provider: string, days: number, named: boolean, questionId = "q1"): HistoryRow => ({
  runId,
  questionId,
  provider,
  at: daysAgo(days),
  named,
});

describe("questionHistory", () => {
  it("keeps each AI's last checks in order, oldest first, inside 30 days", () => {
    const rows = [
      row("r0", "openai", 40, true),
      row("r1", "openai", 20, false),
      row("r2", "openai", 13, true),
      row("r3", "openai", 6, true),
      row("r3", "anthropic", 6, false),
      row("r3", "perplexity", 6, true),
    ];
    const h = questionHistory(rows, { now: NOW, models: ["openai", "anthropic"] }).get("q1")!;
    expect(h.pips).toEqual({ openai: [false, true, true], anthropic: [false] });
    // Perplexity is not one of the business's AIs, and the 40-day check is outside the window.
    expect([h.named, h.answers]).toEqual([2, 4]);
  });

  it("keeps at most the last N per AI", () => {
    const rows = Array.from({ length: 14 }, (_, i) => row(`r${i}`, "openai", 28 - i, i % 2 === 0));
    const h = questionHistory(rows, { now: NOW, models: ["openai"], last: 10 }).get("q1")!;
    expect(h.pips.openai).toHaveLength(10);
    expect(h.pips.openai![9]).toBe(false);
  });

  it("splits by question and leaves out questions with no checks", () => {
    const map = questionHistory([row("r1", "openai", 1, true, "a"), row("r1", "openai", 1, false, "b")], { now: NOW, models: ["openai"] });
    expect([...map.keys()].sort()).toEqual(["a", "b"]);
    expect(map.get("c")).toBeUndefined();
  });
});

describe("trendOf", () => {
  it("compares the latest scan with the one before", () => {
    const before = [row("a", "openai", 14, false), row("a", "anthropic", 14, false)];
    expect(trendOf([...before, row("b", "openai", 7, true), row("b", "anthropic", 7, false)])).toBe("up");
    expect(trendOf([row("a", "openai", 14, true), row("b", "openai", 7, false)])).toBe("down");
    expect(trendOf([row("a", "openai", 14, true), row("b", "openai", 7, true)])).toBe("same");
  });

  it("uses the scan before even when it is older than 30 days, and needs 2 scans", () => {
    expect(trendOf([row("a", "openai", 45, false), row("b", "openai", 10, true)])).toBe("up");
    expect(trendOf([row("a", "openai", 7, true), row("a", "anthropic", 7, false)])).toBeNull();
  });

  it("counts an AI that answered twice in one scan once, by the share of AIs that named you", () => {
    const first = [row("a", "openai", 14, true), row("a", "openai", 14, false), row("a", "anthropic", 14, false)];
    const second = [row("b", "openai", 7, true), row("b", "anthropic", 7, false)];
    expect(trendOf([...first, ...second])).toBe("same");
  });
});
