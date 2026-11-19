import { describe, expect, it } from "vitest";
import { effectReadFrom, measureEffect, type EffectCheck } from "./service";

const DONE = new Date("2026-11-10T12:00:00Z");
const at = (iso: string) => new Date(iso);
let n = 0;
const check = (iso: string, mentioned: boolean, key = `answer-${n++}`): EffectCheck => ({ checkedAt: at(iso), mentioned, answerKey: key });

describe("measureEffect (B-98)", () => {
  it("waits until two scans finished after the done date, counting scans, not answers", () => {
    const checks = [check("2026-11-05T02:00:00Z", false), check("2026-11-11T02:00:00Z", true), check("2026-11-11T02:05:00Z", true)];
    const scans = [at("2026-11-05T02:10:00Z"), at("2026-11-11T02:10:00Z")];
    expect(measureEffect(DONE, checks, scans, at("2026-11-12T00:00:00Z"))).toEqual({ state: "waiting", scansSince: 1, scansNeeded: 2 });
  });

  it("counts two scans run minutes apart as two", () => {
    const checks = [check("2026-11-11T02:00:00Z", true), check("2026-11-11T02:20:00Z", false)];
    const scans = [at("2026-11-11T02:01:00Z"), at("2026-11-11T02:21:00Z")];
    expect(measureEffect(DONE, checks, scans, at("2026-11-12T00:00:00Z")).state).toBe("measured");
  });

  it("compares the answers since with the 30 days before, each answer once", () => {
    const checks = [
      check("2026-11-01T02:00:00Z", false),
      check("2026-11-01T02:01:00Z", true),
      check("2026-11-01T02:02:00Z", false),
      check("2026-11-01T02:03:00Z", false),
      check("2026-11-11T02:00:00Z", true),
      check("2026-11-11T02:01:00Z", true),
      check("2026-11-12T02:00:00Z", false),
      check("2026-11-12T02:01:00Z", true, "same-answer"),
      check("2026-11-12T02:02:00Z", true, "same-answer"),
    ];
    const scans = [at("2026-11-11T02:05:00Z"), at("2026-11-12T02:05:00Z")];
    expect(measureEffect(DONE, checks, scans, at("2026-11-13T00:00:00Z"))).toEqual({
      state: "measured",
      before: { named: 1, total: 4 },
      after: { named: 3, total: 4 },
      change: "up",
    });
  });

  it("says the same when nothing was measured before, and ignores answers and scans past 30 days", () => {
    const checks = [check("2026-11-11T02:00:00Z", false), check("2026-11-12T02:00:00Z", false), check("2026-12-20T02:00:00Z", true)];
    const scans = [at("2026-11-11T02:05:00Z"), at("2026-11-12T02:05:00Z"), at("2026-12-20T02:05:00Z")];
    expect(measureEffect(DONE, checks, scans, at("2026-12-25T00:00:00Z"))).toEqual({
      state: "measured",
      before: null,
      after: { named: 0, total: 2 },
      change: "same",
    });
  });

  it("reads back 30 days before the earliest done date", () => {
    expect(effectReadFrom([DONE, at("2026-11-12T00:00:00Z")])?.toISOString()).toBe("2026-10-11T12:00:00.000Z");
    expect(effectReadFrom([])).toBeNull();
  });
});
