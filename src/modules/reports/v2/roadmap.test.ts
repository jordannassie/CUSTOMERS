import { describe, expect, it } from "vitest";
import { buildRoadmap, columnOf } from "./roadmap";
import type { ReportFix } from "./snapshot-schema";

const fix = (n: number, priority: ReportFix["priority"], effort: ReportFix["effort"], extra: Partial<ReportFix> = {}): ReportFix => ({
  n,
  key: `k${n}`,
  title: `Fix thing ${n}`,
  areas: ["google"],
  where: "Google Business Profile",
  priority,
  impact: "medium",
  effort,
  owner: "Marketing",
  evidence: "Google was used in 3 answers.",
  why: "Why.",
  steps: ["One.", "Two."],
  goal: { label: "Target for next scan", text: `Named in ${n} or more answers` },
  wording: "template",
  ...extra,
});

describe("roadmap", () => {
  it("puts critical and quick fixes first, low priority last", () => {
    expect(columnOf({ priority: "critical", effort: "high" })).toBe(0);
    expect(columnOf({ priority: "high", effort: "low" })).toBe(0);
    expect(columnOf({ priority: "medium", effort: "low" })).toBe(0);
    expect(columnOf({ priority: "high", effort: "medium" })).toBe(1);
    expect(columnOf({ priority: "low", effort: "low" })).toBe(2);
  });

  it("always has three columns with goals, and the next scan", () => {
    const fixes = [
      fix(1, "critical", "medium", { key: "own_site_uncited", areas: ["website"], where: "Your website" }),
      fix(2, "high", "low"),
      fix(3, "high", "medium", { areas: ["reviews"], where: "TripAdvisor" }),
      fix(4, "low", "medium"),
    ];
    const r = buildRoadmap(fixes, { leader: "Domino's", nextScanAt: "2026-11-27T09:00:00.000Z" });
    expect(r.columns.map((c) => c.days)).toEqual(["Days 1 to 30", "Days 31 to 60", "Days 61 to 90"]);
    expect(r.columns[0].tasks.map((t) => t.label)).toEqual(["Fix 1: fix thing 1", "Fix 2: fix thing 2"]);
    expect(r.columns[0].goal).toBe("your website appears as a source");
    expect(r.columns[1].tasks.map((t) => t.label)).toEqual(["Fix 3: fix thing 3", "Weekly review requests"]);
    expect(r.columns[1].goal).toBe("named in 3 or more answers");
    expect(r.columns[2].tasks[0]).toEqual({ label: "Fix 4: fix thing 4", area: "Google Business Profile" });
    expect(r.columns[2].goal).toBe("close the gap to Domino's");
    expect(r.nextScanAt).toBe("2026-11-27T09:00:00.000Z");
  });

  it("moves quick fixes past 3 to the second month and never leaves a column empty", () => {
    const r = buildRoadmap([1, 2, 3, 4].map((n) => fix(n, "high", "low")), { leader: null, nextScanAt: null });
    expect(r.columns[0].tasks).toHaveLength(3);
    expect(r.columns[1].tasks[0].label).toBe("Fix 4: fix thing 4");
    const empty = buildRoadmap([], { leader: null, nextScanAt: null });
    expect(empty.columns.every((c) => c.tasks.length > 0)).toBe(true);
  });
});
