import { describe, expect, it } from "vitest";
import { formatDate } from "@/modules/billing/plan-change/copy";
import { pickBanners } from "@/modules/workspace/service";
import { customerDate, utcDate } from "./time-zone";

// BUG-070: one trial end, one day, wherever the customer reads it. 03:00 UTC is already the 13th in Karachi
// (UTC+5) and still the 12th in Los Angeles (UTC-7 in October).
const TRIAL_END = new Date("2026-10-13T03:00:00Z");
const NOW = new Date("2026-10-08T12:00:00Z");
const usage = { balance: 80, topupRemaining: 0, periodCredits: 100, periodUsed: 20 };
const trial = { status: "trialing", trialEndsAt: TRIAL_END, periodEndsAt: null, cancelAt: null };

describe("trial and billing dates (BUG-070)", () => {
  it.each([
    ["Asia/Karachi", "October 13"],
    ["America/Los_Angeles", "October 12"],
  ])("name the same day on the card step, the banner, Billing and the plan dialogs for a viewer in %s", (zone, day) => {
    const cardStepAndBilling = customerDate(TRIAL_END, zone); // what LocalDate renders on both pages
    const banner = pickBanners(usage, trial, NOW, zone).find((b) => b.kind === "trial")!.message;
    const planDialog = formatDate(TRIAL_END.getTime() / 1000, zone);
    expect(cardStepAndBilling).toBe(`${day}, 2026`);
    expect(planDialog).toBe(`${day}, 2026`);
    expect(banner).toContain(`charged on ${day}.`);
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(customerDate(TRIAL_END, "Not/AZone")).toBe("October 13, 2026");
  });

  it("labels UTC where the reader's zone is unknown (emails, admin)", () => {
    expect(utcDate(TRIAL_END)).toBe("October 13 (UTC)");
  });
});
