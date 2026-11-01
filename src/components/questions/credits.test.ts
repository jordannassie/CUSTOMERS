import { describe, expect, it } from "vitest";
import { creditChangeText, monthlyCredits } from "./credits";

describe("credit estimate on the Questions page", () => {
  it("uses the same sum as onboarding and Settings", () => {
    expect(monthlyCredits(12, 3, "weekly")).toBe(155);
  });

  it("shows the change one question makes", () => {
    expect(creditChangeText(12, 1, 3, "weekly")).toBe("About 13 more credits a month");
    expect(creditChangeText(12, -1, 3, "weekly")).toBe("About 13 fewer credits a month");
    expect(creditChangeText(3, 1, 1, "monthly")).toBe("About 1 more credit a month");
    expect(creditChangeText(0, 1, 3, "daily")).toBe("About 90 more credits a month");
  });
});
