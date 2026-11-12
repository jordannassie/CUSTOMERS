import { describe, expect, it } from "vitest";
import { firstBy, isActive, runFailures, runModels, runScanCheck, startOfMonthUtc, sumBy, toScanState, type ScanReadiness } from "./service";

describe("admin businesses rules (B-66)", () => {
  it("maps job and old run statuses to one set of states", () => {
    expect(toScanState("pending")).toBe("queued");
    expect(toScanState("completed")).toBe("done");
    expect(toScanState("running")).toBe("running");
    expect(toScanState("something else")).toBe("failed");
    expect(isActive("queued") && isActive("running")).toBe(true);
    expect(isActive("done") || isActive("failed")).toBe(false);
  });

  it("starts the month at midnight UTC on the 1st", () => {
    expect(startOfMonthUtc(new Date("2026-09-27T23:59:00Z")).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("sums credits per key and skips rows with no key", () => {
    const rows = [
      { b: "a", c: 2 },
      { b: "a", c: 3 },
      { b: null, c: 9 },
      { b: "x", c: 1 },
    ];
    expect(
      Object.fromEntries(
        sumBy(
          rows,
          (r) => r.b,
          (r) => r.c,
        ),
      ),
    ).toEqual({ a: 5, x: 1 });
  });

  it("keeps the first (newest) row per key", () => {
    const rows = [
      { b: "a", at: 3 },
      { b: "a", at: 2 },
      { b: "c", at: 1 },
    ];
    expect([...firstBy(rows, (r) => r.b).values()].map((r) => r.at)).toEqual([3, 1]);
  });

  it("reads the models a run asked and its failures, ignoring older runs' labels and junk", () => {
    expect(runModels("openai,anthropic,perplexity")).toEqual(["openai", "anthropic", "perplexity"]);
    expect(runModels("scan")).toEqual([]);
    expect(runModels(null)).toEqual([]);
    expect(runFailures({ perplexity: { failed: 10, reason: "out of credit" }, other: { failed: 1 } })).toEqual({
      perplexity: { failed: 10, reason: "out of credit" },
    });
    expect(runFailures(null)).toEqual({});
    expect(runFailures([1])).toEqual({});
  });
});

describe("Run scan now readiness (admin audit 2026-11-12)", () => {
  const ready: ScanReadiness = {
    deleted: false,
    agency: { name: "Acme", status: "active" },
    status: "active",
    city: "Austin",
    activeQuestions: 5,
    models: ["openai", "anthropic"],
    balance: 100,
    lastScan: { state: "done", error: null },
  };
  const explain = (e: string) => `plain: ${e}`;

  it("runs with nothing to say when all is well, counting checks on known models only", () => {
    expect(runScanCheck({ ...ready, models: ["openai", "anthropic", "gemini"] }, explain)).toEqual({ blocked: null, warnings: [], credits: 10 });
  });

  it("is off with a reason when the scan cannot do anything", () => {
    const blocked = (f: Partial<ScanReadiness>) => runScanCheck({ ...ready, ...f }, explain).blocked;
    expect(blocked({ status: "onboarding", activeQuestions: 0 })).toMatch(/still being set up/);
    expect(blocked({ status: "paused" })).toMatch(/paused/);
    expect(blocked({ activeQuestions: 0 })).toMatch(/no active questions/);
    expect(blocked({ models: [] })).toMatch(/No AI models/);
    expect(blocked({ city: null })).toMatch(/no city/);
    expect(blocked({ agency: null })).toMatch(/No agency/);
    expect(blocked({ deleted: true })).toMatch(/deleted/);
  });

  it("warns about too few credits, with the balance and what the scan needs", () => {
    expect(runScanCheck({ ...ready, balance: 4 }, explain).warnings).toEqual([
      "Acme has 4 credits and this scan needs about 10 credits. It still runs, and the balance goes below zero.",
    ]);
    expect(runScanCheck({ ...ready, balance: 0 }, explain).warnings[0]).toMatch(/^Acme has 0 credits and this scan needs about 10 credits\. With no credits the scan is skipped/);
  });

  it("says why the last scan failed or was skipped", () => {
    expect(runScanCheck({ ...ready, lastScan: { state: "failed", error: "boom" } }, explain).warnings).toEqual(["The last scan failed: plain: boom"]);
    expect(runScanCheck({ ...ready, lastScan: { state: "skipped", error: "No credits" } }, explain).warnings).toEqual([
      "The last scan was skipped: plain: No credits",
    ]);
  });
});
