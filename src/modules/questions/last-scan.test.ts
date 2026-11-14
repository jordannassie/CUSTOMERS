import { describe, expect, it } from "vitest";
import { askedInScan, checkKey, failedChecks } from "./last-scan";

// BUG-074: a check the last scan could not do says so, never "Not checked yet".
describe("failedChecks", () => {
  const startedAt = "2026-10-20T10:00:00+00:00";
  const questions = [
    { id: "q1", active: true, createdAt: "2026-10-01T09:00:00+00:00" },
    { id: "q2", active: true, createdAt: "2026-10-01T09:00:00+00:00" },
    // Added after the scan started, so it was never asked.
    { id: "q3", active: true, createdAt: "2026-10-21T09:00:00+00:00" },
    { id: "q4", active: false, createdAt: "2026-10-01T09:00:00+00:00" },
  ];

  it("flags the questions an AI with failures has no saved answer for", () => {
    const saved = new Set([checkKey("q1", "openai"), checkKey("q2", "openai"), checkKey("q1", "anthropic")]);
    const failed = failedChecks({ startedAt, failures: { anthropic: 1 }, saved }, questions, ["openai", "anthropic"]);
    expect([...failed]).toEqual(["q2:anthropic"]);
  });

  it("flags every asked question for an AI the scan skipped", () => {
    const failed = failedChecks({ startedAt, failures: { perplexity: 2 }, saved: new Set() }, questions, ["openai", "perplexity"]);
    expect([...failed].sort()).toEqual(["q1:perplexity", "q2:perplexity"]);
  });

  it("flags nothing when nothing failed, before the first scan, or for an AI no longer chosen", () => {
    expect(failedChecks({ startedAt, failures: {}, saved: new Set() }, questions, ["openai"]).size).toBe(0);
    expect(failedChecks({ startedAt: null, failures: { openai: 3 }, saved: new Set() }, questions, ["openai"]).size).toBe(0);
    expect(failedChecks({ startedAt, failures: { anthropic: 3 }, saved: new Set() }, questions, ["openai"]).size).toBe(0);
  });

  it("counts only the active questions added before the scan started", () => {
    expect(askedInScan(questions, startedAt).map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(askedInScan([{ id: "q5", active: true }], startedAt)).toEqual([]);
  });
});
