import { describe, expect, it } from "vitest";
import { canMove, inRange, monthGrid, openingMonth, pickDay, PRESETS, rangeLabel, selectable } from "./date-range";

const NOW = new Date("2026-11-12T15:00:00Z");
const preset = (key: string) => PRESETS.find((p) => p.key === key)!.range(NOW);

describe("Scans date range (2026-11-12)", () => {
  it("works out the quick choices in UTC", () => {
    expect(preset("today")).toEqual({ from: "2026-11-12", to: "2026-11-12" });
    expect(preset("7")).toEqual({ from: "2026-11-06", to: "2026-11-12" });
    expect(preset("month")).toEqual({ from: "2026-11-01", to: "2026-11-12" });
    expect(preset("last-month")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(preset("any")).toEqual({});
  });

  it("lays a month out Monday first", () => {
    const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("starts a range on the first click and ends it on the second, in either order", () => {
    const first = pickDay({}, "2026-11-10", false);
    expect(first).toEqual({ range: { from: "2026-11-10", to: undefined }, done: false });
    expect(pickDay(first.range, "2026-11-03", true)).toEqual({ range: { from: "2026-11-03", to: "2026-11-10" }, done: true });
    expect(pickDay(first.range, "2026-11-20", true)).toEqual({ range: { from: "2026-11-10", to: "2026-11-20" }, done: true });
  });

  it("marks the days inside the range", () => {
    expect(inRange("2026-11-05", { from: "2026-11-03", to: "2026-11-10" })).toBe(true);
    expect(inRange("2026-11-11", { from: "2026-11-03", to: "2026-11-10" })).toBe(false);
    expect(inRange("2026-11-03", { from: "2026-11-03" })).toBe(true);
  });

  it("labels the button in words, never with a dash", () => {
    expect(rangeLabel({})).toBe("Any date");
    expect(rangeLabel({ from: "2026-11-12", to: "2026-11-12" })).toBe("Nov 12, 2026");
    expect(rangeLabel({ from: "2026-11-01", to: "2026-11-12" })).toBe("Nov 1 to Nov 12, 2026");
    expect(rangeLabel({ from: "2025-12-20", to: "2026-01-05" })).toBe("Dec 20, 2025 to Jan 5, 2026");
    expect(rangeLabel({ from: "2026-11-01" })).toBe("Since Nov 1, 2026");
  });

  it("keeps the calendar to the last 12 months, never the future", () => {
    expect(openingMonth({}, NOW)).toEqual({ year: 2026, month: 10 });
    expect(openingMonth({ from: "2026-09-03" }, NOW)).toEqual({ year: 2026, month: 8 });
    expect(openingMonth({ from: "1914-01-01" }, NOW)).toEqual({ year: 2025, month: 10 });
    expect(canMove({ year: 2026, month: 10 }, 1, NOW)).toBe(false);
    expect(canMove({ year: 2026, month: 10 }, -1, NOW)).toBe(true);
    expect(canMove({ year: 2025, month: 10 }, -1, NOW)).toBe(false);
    expect(selectable("2026-11-12", NOW)).toBe(true);
    expect(selectable("2026-11-13", NOW)).toBe(false);
    expect(selectable("2025-11-01", NOW)).toBe(true);
    expect(selectable("2025-10-31", NOW)).toBe(false);
  });
});
