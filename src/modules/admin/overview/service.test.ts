import { describe, expect, it } from "vitest";
import { countChange, lastDays, monthBounds, percentChange, sumDays } from "./service";

describe("monthBounds", () => {
  it("lines this month up with the same stretch of last month, cut at a shorter month's end", () => {
    expect(monthBounds(new Date("2026-10-15T12:00:00Z"))).toEqual({
      monthStart: new Date("2026-10-01T00:00:00Z"),
      lastMonthStart: new Date("2026-09-01T00:00:00Z"),
      lastMonthSameTime: new Date("2026-09-15T12:00:00Z"),
    });
    expect(monthBounds(new Date("2026-03-31T10:00:00Z")).lastMonthSameTime).toEqual(new Date("2026-03-01T00:00:00Z"));
  });
});

describe("sumDays and lastDays", () => {
  const byDay = [
    { day: "2026-09-01", credits: 10, costUsd: 1 },
    { day: "2026-09-02", credits: 5, costUsd: 0.5 },
    { day: "2026-10-01", credits: 7, costUsd: 0.7 },
  ];
  it("adds the days in range, the last day included", () => {
    expect(sumDays(byDay, new Date("2026-09-01T00:00:00Z"), new Date("2026-09-02T08:00:00Z"))).toEqual({ credits: 15, costUsd: 1.5 });
  });
  it("keeps the last 30 days", () => {
    expect(lastDays(byDay, new Date("2026-10-01T12:00:00Z")).map((d) => d.day)).toEqual(["2026-09-02", "2026-10-01"]);
  });
});

describe("percentChange and countChange", () => {
  it("words the change plainly", () => {
    expect(percentChange(112, 100).text).toBe("Up 12% on the same days last month");
    expect(percentChange(50, 100)).toEqual({ direction: "down", text: "Down 50% on the same days last month" });
    expect(percentChange(5, 0).text).toBe("None by this day last month");
    expect(percentChange(2357, 10).text).toBe("About 236 times the same days last month");
    expect(countChange(12, 9, new Date("2026-10-01T00:00:00Z"))).toEqual({ direction: "up", text: "Up 3 since Oct 1" });
    expect(countChange(9, 9, new Date("2026-10-01T00:00:00Z")).text).toBe("No change since Oct 1");
  });
});
