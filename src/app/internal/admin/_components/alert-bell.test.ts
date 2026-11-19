import { describe, expect, it } from "vitest";
import { bellText } from "./alert-bell";

describe("bellText (admin alert bell, 2026-11-18)", () => {
  it("drops what the title and the System status link already say", () => {
    const message = "Perplexity is not working. Out of credit. Perplexity checks can't run. Found by the System status check.";
    expect(bellText({ serviceCheck: true, message })).toBe("Out of credit. Perplexity checks can't run.");
  });
  it("keeps other alerts, and a service message with nothing else to say, as they are", () => {
    expect(bellText({ serviceCheck: false, message: "1 of 2 scans failed in one hour (50%)." })).toBe("1 of 2 scans failed in one hour (50%).");
    expect(bellText({ serviceCheck: true, message: "Stripe is not working." })).toBe("Stripe is not working.");
  });
});
