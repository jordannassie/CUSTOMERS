import { describe, expect, it } from "vitest";
import { alertKindLabel } from "./open-alerts";

// Admin audit 2026-11-12: an alert kind the page did not know showed its raw code ("qa_probe") as its title.
describe("alertKindLabel", () => {
  it("names known kinds in plain words", () => {
    expect(alertKindLabel("webhook_failures", false)).toBe("Stripe payment updates");
    expect(alertKindLabel("service_check:stripe", true)).toBe("Service check");
  });
  it("never shows an internal code", () => {
    expect(alertKindLabel("qa_probe", false)).toBe("Other alert");
  });
});
