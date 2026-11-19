import { describe, expect, it } from "vitest";
import { LATE_POLL_MS, nextPollDelay, POLL_MS, STILL_SETTING_UP_MS, STOP_POLLING_MS } from "./setting-up-poll";

describe("nextPollDelay", () => {
  it("checks every 2 seconds at first", () => {
    expect(nextPollDelay(0)).toBe(POLL_MS);
    expect(nextPollDelay(STILL_SETTING_UP_MS)).toBe(POLL_MS);
  });

  it("backs off once the late notice shows", () => {
    expect(nextPollDelay(STILL_SETTING_UP_MS + 1)).toBe(LATE_POLL_MS);
    expect(nextPollDelay(STOP_POLLING_MS - 1)).toBe(LATE_POLL_MS);
  });

  it("stops after 10 minutes", () => {
    expect(nextPollDelay(STOP_POLLING_MS)).toBeNull();
    expect(nextPollDelay(STOP_POLLING_MS * 3)).toBeNull();
  });
});
