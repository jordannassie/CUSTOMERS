import { describe, expect, it } from "vitest";
import { durationMs, formatDuration } from "./service";

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
