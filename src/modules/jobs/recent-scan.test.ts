import { describe, expect, it } from "vitest";
import { needsRecentScanConfirm } from "./overdraft";
import { recentScanNeeded, recentScanWarning, scannedRecently } from "./recent-scan";

// 2026-10-15 (D-24): Run scan asks first when the business was scanned in the last 20 hours, the answer cache's age.
describe("rescan within 20 hours", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("counts a finished scan less than 20 hours old as recent", () => {
    expect(scannedRecently("2026-10-15T09:00:00Z", now)).toBe(true);
    expect(scannedRecently("2026-10-14T16:00:01Z", now)).toBe(true);
    // 20 to 24 hours ago the cache has no answers left to reuse, so nothing to warn about.
    expect(scannedRecently("2026-10-14T16:00:00Z", now)).toBe(false);
    expect(scannedRecently("2026-10-14T13:00:00Z", now)).toBe(false);
    expect(scannedRecently(null, now)).toBe(false);
  });

  it("says the answers mostly repeat and the reused ones are free (D-24, 2026-10-20)", () => {
    expect(recentScanWarning()).toBe("You scanned in the last 20 hours, so most answers will be the same as last time. Reused answers don't use credits.");
    const asked = recentScanNeeded(36);
    expect(needsRecentScanConfirm(asked)).toBe(true);
    expect(needsRecentScanConfirm({ ok: false, status: 409, error: "busy" })).toBe(false);
  });
});
