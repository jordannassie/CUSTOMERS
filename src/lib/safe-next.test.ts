import { describe, expect, it } from "vitest";
import { loginPathFor, safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeNextPath("/dashboard/visibility?tab=2")).toBe("/dashboard/visibility?tab=2");
  });

  it.each([null, undefined, "", "dashboard", "https://evil.test", "//evil.test", "/\\evil.test", "/a\nb"])(
    "falls back for %j",
    (next) => {
      expect(safeNextPath(next)).toBe("/dashboard");
    },
  );

  it("builds a login link that comes back to the page", () => {
    expect(loginPathFor("/dashboard/reports")).toBe("/login?next=%2Fdashboard%2Freports");
  });
});
