import { describe, expect, it } from "vitest";
import { validTimeZone } from "./time-zone";

describe("validTimeZone", () => {
  it("keeps a real zone and falls back to UTC for anything else", () => {
    expect(validTimeZone("America/Los_Angeles")).toBe("America/Los_Angeles");
    expect(validTimeZone("Not/AZone")).toBe("UTC");
    expect(validTimeZone(undefined)).toBe("UTC");
  });
});
