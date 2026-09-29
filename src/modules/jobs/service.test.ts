import { describe, expect, it } from "vitest";
import { scanStatusView } from "./service";

const ok = { allowed: true, reason: "" };
const broke = { allowed: false, reason: "You're out of credits. Buy a top-up or upgrade." };

describe("scanStatusView", () => {
  it("shows Scanning for a queued or running job and hides any block while it runs", () => {
    expect(scanStatusView({ status: "queued", finishedAt: null }, ok)).toMatchObject({ scanning: true, blockedReason: null });
    expect(scanStatusView({ status: "running", finishedAt: null }, broke)).toMatchObject({ scanning: true, blockedReason: null });
  });

  it("says when a failed attempt waits to run again", () => {
    const error = "capture_credit failed: canceling statement due to statement timeout";
    expect(scanStatusView({ status: "queued", finishedAt: null, error }, ok)).toMatchObject({ scanning: true, retrying: true });
    expect(scanStatusView({ status: "queued", finishedAt: null, error: null }, ok)).toMatchObject({ retrying: false });
    expect(scanStatusView({ status: "running", finishedAt: null, error }, ok)).toMatchObject({ scanning: true, retrying: false });
  });

  it("reports how the last scan ended", () => {
    const at = "2026-09-27T12:00:00Z";
    expect(scanStatusView({ status: "done", finishedAt: at }, ok)).toEqual({
      scanning: false,
      retrying: false,
      lastResult: "done",
      lastFinishedAt: at,
      blockedReason: null,
    });
    expect(scanStatusView({ status: "failed", finishedAt: at }, ok)).toMatchObject({ lastResult: "failed" });
  });

  it("explains why a scan cannot start", () => {
    expect(scanStatusView(null, broke)).toEqual({
      scanning: false,
      retrying: false,
      lastResult: null,
      lastFinishedAt: null,
      blockedReason: broke.reason,
    });
  });
});
