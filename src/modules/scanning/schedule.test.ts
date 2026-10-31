import { describe, expect, it } from "vitest";
import { CACHE_TTL_MS } from "./cache";
import { MIN_SCAN_GAP_MS, nextScanAt, scheduledRunAtOrAfter } from "./schedule";

// H1: a scheduled scan never reuses, and pays again for, the answers of the business's last scan.
const at = (iso: string) => new Date(iso);
const HOUR = 3_600_000;

describe("next scan date (H1)", () => {
  it("sends a first scan at 15:00 to the 02:00 run at least 20 hours later, not the next night's", () => {
    const from = at("2026-10-16T15:00:00Z");
    const next = nextScanAt("daily", from);
    expect(next.toISOString()).toBe("2026-10-18T02:00:00.000Z");
    expect(next.getTime() - from.getTime()).toBeGreaterThanOrEqual(20 * HOUR);
  });

  it("keeps a daily scan from the 02:00 run on the next night's run", () => {
    expect(nextScanAt("daily", at("2026-10-16T02:00:00Z")).toISOString()).toBe("2026-10-17T02:00:00.000Z");
    expect(nextScanAt("daily", at("2026-10-16T02:40:00Z")).toISOString()).toBe("2026-10-17T02:00:00.000Z");
    // A long queue: finished after 06:00, the next night would be under 20 hours away.
    expect(nextScanAt("daily", at("2026-10-16T06:30:00Z")).toISOString()).toBe("2026-10-18T02:00:00.000Z");
  });

  it("puts weekly and monthly scans on the run of the day their frequency points to", () => {
    expect(nextScanAt("weekly", at("2026-10-16T15:00:00Z")).toISOString()).toBe("2026-10-23T02:00:00.000Z");
    expect(nextScanAt("monthly", at("2026-10-16T02:05:00Z")).toISOString()).toBe("2026-11-15T02:00:00.000Z");
    expect(nextScanAt("unknown", at("2026-10-16T02:05:00Z")).toISOString()).toBe("2026-10-23T02:00:00.000Z");
  });

  it("always lands on a 02:00 UTC run", () => {
    expect(scheduledRunAtOrAfter(at("2026-10-16T01:59:00Z")).toISOString()).toBe("2026-10-16T02:00:00.000Z");
    expect(scheduledRunAtOrAfter(at("2026-10-16T02:00:00Z")).toISOString()).toBe("2026-10-16T02:00:00.000Z");
    expect(scheduledRunAtOrAfter(at("2026-10-16T02:00:01Z")).toISOString()).toBe("2026-10-17T02:00:00.000Z");
  });

  it("keeps the shared answer cache shorter than the shortest gap between two scans of a business", () => {
    expect(CACHE_TTL_MS).toBeLessThanOrEqual(MIN_SCAN_GAP_MS);
    expect(CACHE_TTL_MS).toBeLessThan(24 * HOUR);
    // Every finish time across a day, for every frequency: the next scan comes after the cache window has passed.
    for (const frequency of ["daily", "weekly", "monthly"]) {
      for (let minute = 0; minute < 24 * 60; minute += 7) {
        const from = new Date(Date.UTC(2026, 9, 16) + minute * 60_000);
        const next = nextScanAt(frequency, from);
        expect(next.getTime() - from.getTime()).toBeGreaterThanOrEqual(CACHE_TTL_MS);
        expect(next.getUTCHours()).toBe(2);
        expect(next.getUTCMinutes()).toBe(0);
      }
    }
  });
});
