import { describe, expect, it } from "vitest";
import { needsRecentScanConfirm } from "./overdraft";
import { recentScanNeeded, recentScanWarning, scannedRecently } from "./recent-scan";

// 2026-10-15 (D-54, charging unchanged): Run scan asks first when the business was scanned in the last 24 hours.
describe("same-day rescan", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("counts a finished scan less than 24 hours old as recent", () => {
    expect(scannedRecently("2026-10-15T09:00:00Z", now)).toBe(true);
    expect(scannedRecently("2026-10-14T12:00:01Z", now)).toBe(true);
    expect(scannedRecently("2026-10-14T12:00:00Z", now)).toBe(false);
    expect(scannedRecently(null, now)).toBe(false);
  });

  it("says how many credits the scan still uses", () => {
    expect(recentScanWarning(36)).toBe("You scanned today. Most answers will be the same as the last scan and still use 36 credits.");
    expect(recentScanWarning(1)).toContain("still use 1 credit.");
    const asked = recentScanNeeded(36);
    expect(needsRecentScanConfirm(asked)).toBe(true);
    expect(needsRecentScanConfirm({ ok: false, status: 409, error: "busy" })).toBe(false);
  });
});
