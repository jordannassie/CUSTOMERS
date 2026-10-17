import { describe, expect, it } from "vitest";
import { NO_SAMPLE_ANSWERS_TEXT, STALLED_QUEUED_MINUTES, STALLED_RUNNING_MINUTES, scanStatusView } from "./service";

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
      stalled: false,
      lastResult: "done",
      lastFinishedAt: at,
      blockedReason: null,
      failedReason: null,
    });
    expect(scanStatusView({ status: "failed", finishedAt: at }, ok)).toMatchObject({ lastResult: "failed" });
  });

  it("explains why a scan cannot start", () => {
    expect(scanStatusView(null, broke)).toEqual({
      scanning: false,
      retrying: false,
      stalled: false,
      lastResult: null,
      lastFinishedAt: null,
      blockedReason: broke.reason,
      failedReason: null,
    });
  });

  it("says a test business has no sample answers instead of a plain failure (BUG-072)", () => {
    const at = "2026-10-14T12:00:00Z";
    const failed = scanStatusView({ status: "failed", finishedAt: at, error: "Every check failed: No sample answers for this kind of business" }, ok);
    expect(failed.failedReason).toBe(NO_SAMPLE_ANSWERS_TEXT);
    expect(NO_SAMPLE_ANSWERS_TEXT).toMatch(/^No sample answers for this kind of business\./);
    expect(scanStatusView({ status: "failed", finishedAt: at, error: "Every check failed: openai timeout" }, ok).failedReason).toBeNull();
  });

  describe("stalled", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
    const view = (job: Parameters<typeof scanStatusView>[0]) => scanStatusView(job, ok, now).stalled;

    it("flags a queued job no worker picked up long after it was due", () => {
      expect(view({ status: "queued", finishedAt: null, runAfter: ago(STALLED_QUEUED_MINUTES + 1), lockedAt: null })).toBe(true);
      expect(view({ status: "queued", finishedAt: null, runAfter: ago(1), lockedAt: null })).toBe(false);
    });

    it("leaves a retry waiting for its turn alone", () => {
      const later = new Date(now.getTime() + 10 * 60_000).toISOString();
      expect(view({ status: "queued", finishedAt: null, runAfter: later, lockedAt: null, error: "timeout" })).toBe(false);
    });

    it("flags a running job that outlived the worker's time budget", () => {
      expect(view({ status: "running", finishedAt: null, runAfter: ago(60), lockedAt: ago(STALLED_RUNNING_MINUTES + 1) })).toBe(true);
      expect(view({ status: "running", finishedAt: null, runAfter: ago(60), lockedAt: ago(5) })).toBe(false);
    });

    it("never flags a finished scan, a fresh Run scan, or no scan", () => {
      expect(view({ status: "done", finishedAt: ago(60), runAfter: ago(120), lockedAt: ago(119) })).toBe(false);
      expect(view({ status: "queued", finishedAt: null })).toBe(false);
      expect(scanStatusView(null, ok, now).stalled).toBe(false);
    });
  });
});
