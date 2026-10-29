import { describe, expect, it } from "vitest";
import type { ScoreReport } from "@/modules/scanning";
import type { CompetitorsView, LeaderRow } from "./service";
import { leaderTable } from "./table";
import type { WhyPanel } from "./why/service";

const row = (name: string, score: number | null, over: Partial<LeaderRow> = {}): LeaderRow => ({
  name,
  isYou: false,
  score,
  standing: "behind",
  collecting: false,
  change: null,
  shade: 1,
  ...over,
});
const view = {
  leaderboard: [row("Pizza Hut", 38), row("Domino's", 28), row("Cheezious", 15, { isYou: true, standing: null }), row("Dampukh", 0, { standing: "ahead" })],
} as CompetitorsView;
const report = {
  charts: {
    names: ["Cheezious", "Pizza Hut", "Domino's", "Dampukh"],
    timeline: [
      { date: "2026-10-08", scores: [12, 40, 20, 0], rolling: [12, 40, 20, 0] },
      { date: "2026-10-17", scores: [18.4, 35, 30, 0], rolling: [15, 38, 28, 0] },
    ],
    share: [],
    byModel: [{ model: "openai", scores: [0, 75, 15, 0] }],
  },
} as unknown as ScoreReport;
const panel = (name: string, reason: string) => ({ competitorId: `id-${name}`, trackedName: name, why: { reasons: [{ title: reason }], youLead: [{ title: "You lead" }] } }) as unknown as WhyPanel;

describe("leaderTable", () => {
  const { rows, kpis } = leaderTable(view, report, [panel("Pizza Hut", "Google points AI to them"), panel("Dampukh", "x")]);

  it("ranks by score, with each row's sparkline, AI scores and top reason", () => {
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    expect(rows[0]).toMatchObject({ topReason: "Google points AI to them", spark: [40, 35], byModel: { openai: 75 }, competitorId: "id-Pizza Hut" });
    expect(rows[2]).toMatchObject({ isYou: true, spark: [12, 18], topReason: null });
    expect(rows[3].topReason).toBe("You lead");
  });

  it("says your rank, the leader, the gap and the next one to pass", () => {
    expect(kpis).toEqual({
      rank: { place: 3, of: 4 },
      leader: { name: "Pizza Hut", score: 38, isYou: false, standing: "behind" },
      gap: 23,
      next: { name: "Domino's", points: 13, standing: "behind" },
    });
  });

  it("names a chain by its brand only in the tiles, while its row keeps (all locations)", () => {
    const chain = { brand: "Domino's", tracked: ["Domino's Pizza Saddar"] };
    const chained = { leaderboard: view.leaderboard.map((r) => (r.name === "Domino's" ? { ...r, chain } : r)) } as CompetitorsView;
    const out = leaderTable(chained, report, []);
    expect(out.kpis.next?.name).toBe("Domino's");
    expect(out.rows[1].name).toBe("Domino's (all locations)");
  });

  it("says about the same when the one above is inside the margin", () => {
    const close = { leaderboard: view.leaderboard.map((r) => (r.name === "Domino's" ? { ...r, standing: "about_same" as const } : r)) } as CompetitorsView;
    expect(leaderTable(close, report, []).kpis.next).toMatchObject({ name: "Domino's", standing: "about_same" });
  });

  it("leaves out competitors still collecting from the place", () => {
    const collecting = { leaderboard: view.leaderboard.map((r) => (r.name === "Pizza Hut" ? { ...r, collecting: true } : r)) } as CompetitorsView;
    expect(leaderTable(collecting, report, []).kpis.rank).toEqual({ place: 2, of: 3 });
  });
});
