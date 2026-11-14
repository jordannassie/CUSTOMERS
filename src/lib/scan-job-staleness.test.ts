import { describe, expect, it } from "vitest";
import { ABANDONED_MINUTES, abandonedBefore, isAbandonedJob } from "./scan-job-staleness";

const now = new Date("2026-11-14T12:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe("isAbandonedJob", () => {
  it("abandons a queued scan no worker picked up for over two hours after it was due", () => {
    expect(isAbandonedJob({ status: "queued", runAfter: ago(ABANDONED_MINUTES + 1) }, now)).toBe(true);
    expect(isAbandonedJob({ status: "queued", runAfter: ago(30) }, now)).toBe(false);
    // A retry waiting for its turn is due later, not abandoned.
    expect(isAbandonedJob({ status: "queued", runAfter: new Date(now.getTime() + 60_000).toISOString() }, now)).toBe(false);
  });

  it("abandons a running scan only after two hours with no sign of life; a live scan refreshes locked_at", () => {
    expect(isAbandonedJob({ status: "running", lockedAt: ago(ABANDONED_MINUTES + 1) }, now)).toBe(true);
    expect(isAbandonedJob({ status: "running", lockedAt: ago(5) }, now)).toBe(false);
  });

  it("never abandons a finished scan", () => {
    for (const status of ["done", "failed", "skipped"]) expect(isAbandonedJob({ status, runAfter: ago(10_000) }, now)).toBe(false);
  });

  it("gives the cut-off the database query uses", () => {
    expect(abandonedBefore(now)).toBe(ago(ABANDONED_MINUTES));
  });
});
