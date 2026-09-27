import { describe, expect, it } from "vitest";
import { firstBy, isActive, startOfMonthUtc, sumBy, toScanState } from "./service";

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
});
