import { describe, expect, it } from "vitest";
import type { ScoreReport } from "@/modules/scanning";
import { overviewCompete } from "./overview";
import type { CompetitorsView, LeaderRow } from "./service";

const row = (name: string, score: number, over: Partial<LeaderRow> = {}): LeaderRow => ({ name, isYou: false, score, standing: "behind", collecting: false, change: null, shade: 1, ...over });

describe("overviewCompete", () => {
  const view = {
    leaderboard: [row("A", 50), row("B", 40), row("C", 30), row("D", 20), row("You Co", 10, { isYou: true, standing: null })],
  } as CompetitorsView;
  const report = {
    charts: {
      names: ["You Co", "A", "B", "C", "D"],
      timeline: [{ date: "2026-10-17", scores: [12, 55, 40, 30, 20], rolling: [10, 50, 40, 30, 20] }],
      share: [{ mentions: 2, share: 10 }, { mentions: 8, share: 40 }, { mentions: 5, share: 25 }, { mentions: 3, share: 15 }, { mentions: 2, share: 10 }],
      byModel: [{ model: "openai", scores: [0, 75, 15, null, 5] }],
      period: { days: 7, answers: 20, named: [3, 9, 6, 3, 2], prevAnswers: 18, prevNamed: [1, 8, 5, 3, 2] },
    },
  } as unknown as ScoreReport;
  const out = overviewCompete(view, report);

  it("keeps you among the four businesses shown", () => {
    expect(out.stand.map((s) => s.name)).toEqual(["A", "B", "C", "You Co"]);
  });

  it("says your share, place, each tool's leaders, and the period counts", () => {
    expect(out.share).toEqual({ percent: 10, rank: 4, of: 5 });
    expect(out.modelContext.openai).toBe("A 75 · B 15");
    expect(out.lines.map((l) => [l.key, l.name, l.latest])).toEqual([
      ["s0", "You Co", 12],
      ["s1", "A", 55],
      ["s2", "B", 40],
      ["s3", "C", 30],
      ["s4", "D", 20],
    ]);
    expect(out.timeline[0]).toEqual({ label: "Oct 17", rolling: 10, s0: 12, s1: 55, s2: 40, s3: 30, s4: 20 });
    expect(out.leaderName).toBe("A");
    expect(out.period).toEqual({ days: 7, answers: 20, named: 3, prevAnswers: 18, prevNamed: 1 });
  });
});
