import { describe, expect, it } from "vitest";
import { forecast, forecastWindow, scheduledScans, startOfMonthUtc, totalsBy, type Schedule } from "./service";

const now = new Date("2026-09-10T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
const weekly = (over: Partial<Schedule> = {}): Schedule => ({
  businessId: "b1",
  businessName: "Joe's Plumbing",
  frequency: "weekly",
  nextScanAt: days(1),
  creditsPerScan: 36,
  ...over,
});

describe("forecastWindow", () => {
  it("uses the trial end during a trial", () => {
    expect(forecastWindow({ status: "trialing", trialEndsAt: days(5), periodEndsAt: days(20) }, now)).toEqual({
      endsAt: days(5),
      kind: "trial",
    });
  });

  it("uses the period end once paid", () => {
    expect(forecastWindow({ status: "active", trialEndsAt: null, periodEndsAt: days(20) }, now).kind).toBe("renewal");
  });

  it("falls back to the next 30 days when no date is ahead", () => {
    expect(forecastWindow({ status: "active", trialEndsAt: null, periodEndsAt: days(-1) }, now)).toEqual({
      endsAt: days(30),
      kind: "estimate",
    });
  });
});

describe("scheduledScans", () => {
  it("counts every weekly scan up to the end date", () => {
    expect(scheduledScans([weekly()], now, days(21)).map((s) => s.at)).toEqual([days(1), days(8), days(15)]);
  });

  it("runs an overdue or unscheduled business now", () => {
    expect(scheduledScans([weekly({ nextScanAt: days(-3) })], now, days(2))[0].at).toEqual(now);
    expect(scheduledScans([weekly({ nextScanAt: null })], now, days(2))[0].at).toEqual(now);
  });

  it("skips businesses with nothing to check", () => {
    expect(scheduledScans([weekly({ creditsPerScan: 0 })], now, days(30))).toEqual([]);
  });
});

describe("forecast", () => {
  it("says the credits last when the scans fit", () => {
    const result = forecast([weekly()], 200, { endsAt: days(21), kind: "renewal" }, now);
    expect(result).toMatchObject({ scans: 3, needed: 108, available: 200, runsOutAt: null });
  });

  it("dates the first scan the balance cannot cover", () => {
    const daily = weekly({ businessId: "b2", frequency: "daily", nextScanAt: days(1), creditsPerScan: 10 });
    const result = forecast([weekly(), daily], 60, { endsAt: days(3), kind: "renewal" }, now);
    // Day 1: 36 + 10, day 2: 10 (56 used), day 3: 10 goes past 60.
    expect(result.needed).toBe(66);
    expect(result.runsOutAt).toEqual(days(3));
  });

  it("runs out at once with a negative balance", () => {
    expect(forecast([weekly()], -5, { endsAt: days(3), kind: "renewal" }, now).runsOutAt).toEqual(days(1));
  });
});

describe("helpers", () => {
  it("starts the month at midnight UTC on the 1st", () => {
    expect(startOfMonthUtc(now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("totals by key, biggest first", () => {
    const rows = [
      { k: "a", n: 1 },
      { k: "b", n: 5 },
      { k: "a", n: 2 },
    ];
    expect(totalsBy(rows, (r) => r.k, (r) => r.n)).toEqual([
      { key: "b", credits: 5 },
      { key: "a", credits: 3 },
    ]);
  });
});
