import { describe, expect, it } from "vitest";
import { getTodayWeekday, weekdayBadge } from "./news-config";

// Local dates (new Date(y, m, d)), as the browser reads the weekday.
describe("LinkedIn studio weekday badge (admin audit 2026-11-12)", () => {
  it("says Today on a weekday", () => {
    expect(weekdayBadge(new Date(2026, 10, 11))).toEqual({ day: "wednesday", label: "Today" });
  });

  it("puts Next on Monday at the weekend instead of Today", () => {
    expect(weekdayBadge(new Date(2026, 10, 14))).toEqual({ day: "monday", label: "Next" });
    expect(weekdayBadge(new Date(2026, 10, 15))).toEqual({ day: "monday", label: "Next" });
    expect(getTodayWeekday(new Date(2026, 10, 15))).toBe("monday");
  });
});
