import { describe, expect, it } from "vitest";
import { distinctLabels, durationMs, formatDuration, partialNote, REPLACED_NOTE, replacedBy, retryState, scanTiming } from "./service";

const S = 1000;
const M = 60 * S;
const H = 60 * M;
const D = 24 * H;

describe("formatDuration (admin Scans)", () => {
  it.each([
    [null, ""],
    [400, "Under 1s"],
    [45 * S, "45s"],
    [3 * M + 26 * S, "3m 26s"],
    [2 * H + 5 * M + 40 * S, "2h 5m"],
    [2 * D + 15 * H + 59 * M, "2d 15h"],
  ])("%s ms reads %j", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });

  it("times a job only once it has started and finished", () => {
    expect(durationMs("2026-10-14T14:00:00Z", "2026-10-14T14:03:26Z")).toBe(3 * M + 26 * S);
    expect(durationMs("2026-10-14T14:00:00Z", null)).toBeNull();
  });
});

describe("scanTiming (admin audit 2026-11-12)", () => {
  const at = (iso: string) => `2026-11-${iso}Z`;
  it("times a normal scan by its run", () => {
    expect(scanTiming({ runStart: at("01T10:00:00"), runEnd: at("01T10:03:26"), lockedAt: at("01T10:00:00"), finishedAt: at("01T10:03:30"), hasRun: true })).toEqual({
      durationMs: 3 * M + 26 * S,
      retriedOverMs: null,
    });
  });

  it("shows the last try's time and the spread when a scan was retried over days", () => {
    const t = scanTiming({ runStart: at("01T10:00:00"), runEnd: at("09T08:02:00"), lockedAt: at("09T08:00:00"), finishedAt: at("09T08:02:00"), hasRun: true });
    expect(t.durationMs).toBe(2 * M);
    expect(t.retriedOverMs).toBe(7 * D + 22 * H + 2 * M);
  });

  it("gives only the spread for a failed scan, which no longer has its last try's start", () => {
    expect(scanTiming({ runStart: at("01T10:00:00"), runEnd: at("03T10:00:00"), lockedAt: null, finishedAt: at("03T10:00:00"), hasRun: true })).toEqual({
      durationMs: null,
      retriedOverMs: 2 * D,
    });
  });

  it("times a skipped scan (no run) by the job", () => {
    expect(scanTiming({ runStart: null, runEnd: null, lockedAt: at("01T10:00:00"), finishedAt: at("01T10:00:02"), hasRun: false })).toEqual({
      durationMs: 2 * S,
      retriedOverMs: null,
    });
  });
});

describe("partialNote", () => {
  it("says how many checks failed and in which AI tools", () => {
    expect(partialNote({ checksTotal: 36, checksFailed: 12, failedByProvider: { perplexity: { failed: 12, reason: "x" } }, error: "x" })).toBe(
      "12 of 36 checks failed (Perplexity).",
    );
    expect(
      partialNote({ checksTotal: 30, checksFailed: 3, failedByProvider: { openai: { failed: 1 }, anthropic: { failed: 1 }, perplexity: { failed: 1 } }, error: "x" }),
    ).toBe("3 of 30 checks failed (ChatGPT, Claude and Perplexity).");
  });

  it("says when Claude checks were left out", () => {
    expect(partialNote({ checksTotal: 24, checksFailed: 0, failedByProvider: { anthropic: { failed: 0, reason: "Claude unavailable, skipped", skipped: 8 } }, error: null })).toBe(
      "8 Claude checks were left out while Claude was unavailable.",
    );
  });

  it("falls back to a short note for runs from before the counts were kept, and says nothing when all worked", () => {
    expect(partialNote({ checksTotal: null, checksFailed: null, failedByProvider: null, error: "timeout" })).toBe("Some checks failed.");
    expect(partialNote({ checksTotal: 36, checksFailed: 0, failedByProvider: null, error: null })).toBeNull();
  });
});

describe("retry rules", () => {
  const job = { status: "failed", error: "Every check failed: timeout", businessDeleted: false, newer: null, blocked: null };

  it("spots a newer done, waiting or running scan of the same business", () => {
    expect(replacedBy("2026-11-01T10:00:00Z", { status: "done", createdAt: "2026-11-02T10:00:00Z" })).toBe("done");
    expect(replacedBy("2026-11-01T10:00:00Z", { status: "queued", createdAt: "2026-11-01T10:00:01.5+00:00" })).toBe("queued");
    expect(replacedBy("2026-11-02T10:00:00Z", { status: "done", createdAt: "2026-11-01T10:00:00Z" })).toBeNull();
    expect(replacedBy("2026-11-01T10:00:00Z", undefined)).toBeNull();
    // A waiting scan blocks a retry (D-55) even when it is older than the failed one.
    expect(replacedBy("2026-11-02T10:00:00Z", { status: "queued", createdAt: "2026-11-01T10:00:00Z" }, { status: "queued" })).toBe("queued");
  });

  it("offers Retry only when it can help", () => {
    expect(retryState(job)).toEqual({ canRetry: true, retryNote: null });
    expect(retryState({ ...job, status: "done" })).toEqual({ canRetry: false, retryNote: null });
    expect(retryState({ ...job, newer: "done" })).toEqual({ canRetry: false, retryNote: REPLACED_NOTE.done });
    expect(retryState({ ...job, status: "skipped", blocked: "Retrying won't help." })).toEqual({ canRetry: false, retryNote: "Retrying won't help." });
    expect(retryState({ ...job, businessDeleted: true })).toMatchObject({ canRetry: false, retryNote: expect.stringContaining("deleted") });
    expect(retryState({ ...job, status: "skipped", error: "This business was deleted.", businessDeleted: true })).toEqual({ canRetry: false, retryNote: null });
  });
});

describe("distinctLabels (filter lists)", () => {
  it("adds a hint only to names that repeat", () => {
    const labels = distinctLabels([
      { id: "a1", name: "daugr.com", hint: "one@example.test" },
      { id: "a2", name: "daugr.com", hint: "two@example.test" },
      { id: "a3", name: "Acme", hint: "acme@example.test" },
    ]).map((a) => a.label);
    expect(labels).toEqual(["daugr.com (one@example.test)", "daugr.com (two@example.test)", "Acme"]);
  });

  it("falls back to the id's start when the hint repeats too", () => {
    const labels = distinctLabels([
      { id: "aaaaaa11", name: "Joe's", hint: "Acme, Austin" },
      { id: "bbbbbb22", name: "Joe's", hint: "Acme, Austin" },
    ]).map((a) => a.label);
    expect(labels).toEqual(["Joe's (Acme, Austin, aaaaaa)", "Joe's (Acme, Austin, bbbbbb)"]);
  });
});
