import { describe, expect, it } from "vitest";
import { SWEEP_MAX_AGE_MS, SWEEP_MIN_AGE_MS, sweepPlan, sweepWindow, type SweepRun } from "./service";

const run = (id: string, businessId: string, completedAt: string): SweepRun => ({ id, businessId, completedAt });

describe("sweepWindow", () => {
  it("looks at runs finished between a day and 15 minutes ago", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    expect(sweepWindow(now)).toEqual({
      from: new Date(now.getTime() - SWEEP_MAX_AGE_MS).toISOString(),
      to: new Date(now.getTime() - SWEEP_MIN_AGE_MS).toISOString(),
    });
    expect(sweepWindow(now).to).toBe("2026-10-28T11:45:00.000Z");
  });
});

describe("sweepPlan", () => {
  it("explains each business's latest finished scan, newest first, up to the limit", () => {
    const unexplained = [run("a", "b1", "2026-10-28T09:00:00Z"), run("b", "b2", "2026-10-28T11:00:00Z"), run("c", "b3", "2026-10-28T10:00:00Z")];
    expect(sweepPlan(unexplained, unexplained, 2)).toEqual({ explain: ["b", "c"], superseded: [] });
  });

  it("only marks a run that a newer finished scan replaced, explained or not", () => {
    const old = run("old", "b1", "2026-10-28T08:00:00Z");
    const newer = run("newer", "b1", "2026-10-28T11:50:00Z");
    expect(sweepPlan([old], [old, newer], 3)).toEqual({ explain: [], superseded: ["old"] });
    const older = run("older", "b1", "2026-10-28T07:00:00Z");
    expect(sweepPlan([old, older], [old, older], 3)).toEqual({ explain: ["old"], superseded: ["older"] });
  });
});
