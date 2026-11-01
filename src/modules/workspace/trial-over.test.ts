import { describe, expect, it } from "vitest";
import { BILLING_HREF, pickBanners, trialOver, usageWidget, type AccountState, type UsageNumbers } from "./service";

// Still "trialing" after the trial end date: Stripe has not confirmed the first payment, and scans are paused
// (entitlements trialOver). The frame says so, not "trial ends today" or "out of credits" (2026-10-17).

const now = new Date("2026-09-27T12:00:00Z");
const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
const ended: AccountState = { status: "trialing", trialEndsAt: inDays(-2), periodEndsAt: null, cancelAt: null };
const usage = (u: Partial<UsageNumbers>): UsageNumbers => ({ balance: 330, topupRemaining: 0, periodCredits: 0, periodUsed: 0, ...u });

describe("a trial past its end date with no payment confirmed", () => {
  it("is over only once the end date has passed", () => {
    expect(trialOver(ended, now)).toBe(true);
    expect(trialOver({ ...ended, trialEndsAt: now }, now)).toBe(false);
    expect(trialOver({ ...ended, status: "active" }, now)).toBe(false);
  });

  it("says the trial ended in the sidebar, and offers no top-up", () => {
    const view = usageWidget(usage({}), ended, now);
    expect(view.headline).toBe("Trial ended, waiting for your first payment");
    expect(view.showBuyCredits).toBe(false);
    expect(usageWidget(usage({ balance: 0 }), ended, now).details).not.toContain("No credits left");
  });

  it("shows one banner that scans are paused, and nothing about credits", () => {
    expect(pickBanners(usage({ balance: 0, periodCredits: 100, periodUsed: 100 }), ended, now)).toEqual([
      {
        kind: "trial",
        tone: "warning",
        message: "Your free trial ended on September 25. Scans are paused until your first payment goes through.",
        action: { label: "Check billing", href: BILLING_HREF },
      },
    ]);
  });
});
