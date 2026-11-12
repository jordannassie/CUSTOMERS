import { describe, expect, it } from "vitest";
import { scanListQuery } from "@/modules/admin";
import { costCell, durationParts, durationText, spreadWords } from "./scan-cells";
import { CLEAR_FILTERS, hasFilters, scansHref } from "./scan-href";

const H = 60 * 60 * 1000;
const base = { hasRun: true, costUsd: null, isTest: false, status: "done" } as const;

describe("Real cost cell (admin audit 2026-11-12)", () => {
  it("shows the logged cost", () => {
    expect(costCell({ ...base, costUsd: 0.4812 })).toEqual({ text: "$0.48", muted: false });
  });

  it("says Not recorded, not $0.00, when a real scan logged nothing", () => {
    expect(costCell(base)).toMatchObject({ text: "Not recorded", muted: true });
  });

  it("shows $0.00 for a test agency, which uses saved sample answers", () => {
    expect(costCell({ ...base, isTest: true })).toMatchObject({ text: "$0.00", title: expect.stringContaining("sample answers") });
  });

  it("shows a dash for a scan that never ran or is still going", () => {
    expect(costCell({ ...base, hasRun: false, status: "skipped" }).text).toBe("");
    expect(costCell({ ...base, status: "running" }).text).toBe("");
  });
});

describe("Duration cell", () => {
  it("reads a normal scan as before", () => {
    expect(durationText({ durationMs: 206_000, retriedOverMs: null })).toBe("3m 26s");
  });

  it("splits the last try from the days it was retried over", () => {
    expect(durationParts({ durationMs: 120_000, retriedOverMs: 190 * H })).toEqual({ main: "2m 0s", retried: "retried over 8 days" });
    expect(durationText({ durationMs: 120_000, retriedOverMs: 5 * H })).toBe("2m 0s (retried over 5 hours)");
    expect(durationText({ durationMs: null, retriedOverMs: 49 * H })).toBe("Tried over 2 days");
  });

  it("words the spread with the right plural", () => {
    expect(spreadWords(30_000)).toBe("1 minute");
    expect(spreadWords(H)).toBe("1 hour");
    expect(spreadWords(24 * H)).toBe("24 hours");
    expect(spreadWords(72 * H)).toBe("3 days");
  });
});

describe("Scans address", () => {
  it("keeps real or test agencies only (the Overview link), and leaves the default out", () => {
    const real = scanListQuery.parse({ status: "failed", test: "real" });
    expect(scansHref(real)).toBe("/internal/admin/scans?status=failed&test=real");
    expect(scansHref(real, { test: "all" })).toBe("/internal/admin/scans?status=failed");
    expect(scansHref(scanListQuery.parse({}))).toBe("/internal/admin/scans");
  });

  it("knows when a filter is on, and Clear filters keeps the status", () => {
    expect(hasFilters(scanListQuery.parse({}))).toBe(false);
    expect(hasFilters(scanListQuery.parse({ test: "real" }))).toBe(true);
    expect(hasFilters(scanListQuery.parse({ status: "done" }))).toBe(true);
    const all = scanListQuery.parse({ status: "done", test: "test", from: "2026-11-01", agency: "6f1c2b8e-0b7a-4c55-9d0c-1a2b3c4d5e6f" });
    expect(scansHref(all, CLEAR_FILTERS)).toBe("/internal/admin/scans?status=done");
  });
});
