import { describe, expect, it } from "vitest";
import type { ScanStatus } from "@/modules/jobs";
import { FIRST_SCAN_FAILED, firstScanPhase, firstScanProblem } from "./first-scan";

const status = (s: Partial<ScanStatus>): ScanStatus => ({
  scanning: false,
  lastResult: null,
  lastFinishedAt: null,
  blockedReason: null,
  ...s,
});

describe("firstScanPhase", () => {
  it("starts a scan when there has never been one", () => {
    expect(firstScanPhase(status({}))).toBe("start");
  });

  it("keeps waiting while a scan is queued or running, even after an earlier failure", () => {
    expect(firstScanPhase(status({ scanning: true }))).toBe("scanning");
    expect(firstScanPhase(status({ scanning: true, lastResult: "failed" }))).toBe("scanning");
  });

  it("opens the dashboard once a scan finished", () => {
    expect(firstScanPhase(status({ lastResult: "done", lastFinishedAt: "2026-09-28T10:00:00Z" }))).toBe("done");
  });

  it("offers a retry after a failed scan, never an empty dashboard (REL-05)", () => {
    expect(firstScanPhase(status({ lastResult: "failed" }))).toBe("failed");
  });

  it("offers a retry when the scan cannot start, with the reason", () => {
    const blocked = status({ blockedReason: "You're out of credits. Buy a top-up or upgrade." });
    expect(firstScanPhase(blocked)).toBe("failed");
    expect(firstScanProblem(blocked)).toBe("You're out of credits. Buy a top-up or upgrade.");
  });

  it("explains a failed scan when no reason is known", () => {
    expect(firstScanProblem(status({ lastResult: "failed" }))).toBe(FIRST_SCAN_FAILED);
  });
});
