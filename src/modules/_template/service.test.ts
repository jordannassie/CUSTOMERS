import { describe, expect, it } from "vitest";
import { cleanBusinessName } from "./service";

describe("cleanBusinessName", () => {
  it("trims and collapses spaces", () => {
    expect(cleanBusinessName("  Westlake   Dental ")).toBe("Westlake Dental");
  });

  it("rejects empty and too long names", () => {
    expect(cleanBusinessName("   ")).toBeNull();
    expect(cleanBusinessName("a".repeat(121))).toBeNull();
  });
});
