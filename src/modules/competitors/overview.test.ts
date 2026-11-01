import { describe, expect, it } from "vitest";
import type { ScoreReport } from "@/modules/scanning";
import { overviewCompete, periodChange } from "./overview";
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
    // The place is by score, like the Competitors tiles and the report: You Co has the lowest score.
    expect(out.share).toEqual({ percent: 10, rank: 5, of: 5 });
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

  it("counts the share and your website's citations from the score's answers, as the report does", () => {
    const check = (youNamed: boolean, competitors: string[], sites: string[] = []) =>
      ({ provider: "openai", questionId: "q", youNamed, competitors, extracted: null, sites }) as never;
    const checks = [check(true, ["A"], ["youco.com"]), check(false, ["A", "B"]), check(true, [])];
    const shared = overviewCompete(view, report, { checks, domain: "youco.com" });
    // You 2, A 2, B 1 of 5 namings.
    expect(shared.share).toEqual({ percent: 40, rank: 5, of: 5 });
    expect(shared.ownSite).toEqual({ cited: 1, answers: 3, hasSite: true });
  });

  it("shows no share with no competitor tracked, so the hero says to track some instead of 100%", () => {
    const alone = { leaderboard: [row("You Co", 10, { isYou: true, standing: null })] } as CompetitorsView;
    const check = { provider: "openai", questionId: "q", youNamed: true, competitors: [], extracted: null, sites: [] } as never;
    expect(overviewCompete(alone, report, { checks: [check], domain: null }).share).toBeNull();
    expect(overviewCompete(alone, report).share).toBeNull();
  });

  it("names each tool's leaders by the name AI uses, once per chain, and leaves out competitors still collecting", () => {
    const chainView = {
      leaderboard: [
        row("Bennu Coffee on Congress", 50, { chain: { brand: "Bennu Coffee", tracked: ["Bennu Coffee on Congress", "Bennu Coffee on 6th"] } }),
        row("B", 40, { collecting: true, standing: null }),
        row("C", 30),
        row("You Co", 10, { isYou: true, standing: null }),
      ],
    } as CompetitorsView;
    const chainReport = {
      charts: { ...report.charts!, names: ["You Co", "Bennu Coffee on Congress", "B", "C", "Bennu Coffee on 6th"], byModel: [{ model: "openai", scores: [0, 75, 90, 15, 70] }] },
    } as unknown as ScoreReport;
    expect(overviewCompete(chainView, chainReport).modelContext.openai).toBe("Bennu Coffee 75 · C 15");
  });
});

describe("earlierScans", () => {
  const base = { leaderboard: [row("You Co", 10, { isYou: true, standing: null })] } as CompetitorsView;
  const charts = (prevAnswers: number) => ({
    names: ["You Co"],
    timeline: [{ date: "2026-10-25", scores: [10], rolling: [10] }],
    share: [{ mentions: 1, share: 100 }],
    byModel: [],
    period: { days: 7, answers: 6, named: [1], prevAnswers, prevNamed: [0] },
  });

  it("knows a short range left out older scans, so the chart says to pick a longer range", () => {
    expect(overviewCompete(base, { charts: charts(6), firstCheckedAt: null } as unknown as ScoreReport).earlierScans).toBe(true);
    const older = { charts: charts(0), firstCheckedAt: new Date("2026-10-10T09:00:00Z") } as unknown as ScoreReport;
    expect(overviewCompete(base, older).earlierScans).toBe(true);
  });

  it("is false for a first scan", () => {
    const first = { charts: charts(0), firstCheckedAt: new Date("2026-10-25T09:00:00Z") } as unknown as ScoreReport;
    expect(overviewCompete(base, first).earlierScans).toBe(false);
  });
});

describe("periodChange", () => {
  const p = { days: 7, answers: 20, named: 5, prevAnswers: 10, prevNamed: 4 };

  it("compares the share of answers that named you, not the counts", () => {
    // 5 named is more than 4, but 25% of answers is down from 40%.
    expect(periodChange(p)).toEqual({ direction: "down", text: "25% of answers, down from 40% the 7 days before" });
    expect(periodChange({ ...p, named: 10 })).toEqual({ direction: "up", text: "50% of answers, up from 40% the 7 days before" });
    expect(periodChange({ ...p, named: 8 })).toEqual({ direction: "same", text: "40% of answers, the same as the 7 days before" });
  });

  it("says nothing without answers in both ranges", () => {
    expect(periodChange(null)).toBeNull();
    expect(periodChange({ ...p, prevAnswers: 0, prevNamed: 0 })).toBeNull();
    expect(periodChange({ ...p, answers: 0, named: 0 })).toBeNull();
  });
});
