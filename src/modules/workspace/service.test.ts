import { describe, expect, it } from "vitest";
import { TEST_MODE_MESSAGE } from "@/lib/test-mode";
import { BILLING_HREF, BUY_CREDITS_HREF, CHOOSE_PLAN_HREF, pickBanners, shortBalance, usageWidget, type AccountState, type UsageNumbers } from "./service";

const now = new Date("2026-09-27T12:00:00Z");
const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const active: AccountState = { status: "active", trialEndsAt: null, periodEndsAt: inDays(12), cancelAt: null };
const trial: AccountState = { status: "trialing", trialEndsAt: inDays(5), periodEndsAt: null, cancelAt: null };
const usage = (u: Partial<UsageNumbers>): UsageNumbers => ({
  balance: 580,
  topupRemaining: 0,
  periodCredits: 1200,
  periodUsed: 620,
  ...u,
});

describe("usageWidget", () => {
  it("shows credits used and the renewal on a paid plan", () => {
    expect(usageWidget(usage({}), active, now)).toEqual({
      tone: "normal",
      headline: "620 of 1,200 credits used",
      percentUsed: 52,
      details: ["Renews in 12 days"],
      showBuyCredits: false,
      paymentFailed: null,
    });
  });

  it("says the payment failed, with a link to Billing, instead of a renewal date when past due", () => {
    for (const status of ["past_due", "unpaid"]) {
      const view = usageWidget(usage({ balance: 64, periodCredits: 100, periodUsed: 36, topupRemaining: 0 }), { ...active, status }, now);
      expect(view.details.join(" ")).not.toMatch(/Renews/);
      expect(view.paymentFailed).toEqual({ text: "Payment failed. Update your card", href: BILLING_HREF });
    }
    // Out of credits too: the card comes first, so no Buy credits button.
    expect(usageWidget(usage({ balance: 0 }), { ...active, status: "past_due" }, now)).toMatchObject({ showBuyCredits: false, tone: "empty" });
    expect(usageWidget(usage({}), active, now).paymentFailed).toBeNull();
  });

  it("shows days and credits left during the trial", () => {
    const view = usageWidget(usage({ balance: 64, periodCredits: 100, periodUsed: 36 }), trial, now);
    expect(view.headline).toBe("Trial: 5 days left, 64 of 100 credits left");
    expect(view.tone).toBe("normal");
    expect(view.showBuyCredits).toBe(false);
  });

  it("turns amber at 80% used", () => {
    expect(usageWidget(usage({ balance: 200, periodUsed: 1000 }), active, now).tone).toBe("warning");
  });

  it("goes red with Buy credits at 0", () => {
    const view = usageWidget(usage({ balance: 0, periodUsed: 1200 }), active, now);
    expect(view).toMatchObject({ tone: "empty", showBuyCredits: true, percentUsed: 100 });
    expect(view.details).toEqual(["No credits left", "Renews in 12 days"]);
  });

  it("shows how far over a negative balance is", () => {
    const view = usageWidget(usage({ balance: -31, periodUsed: 1200 }), active, now);
    expect(view.tone).toBe("empty");
    expect(view.details[0]).toBe("31 credits over");
  });

  it("never shows a negative trial balance as credits left", () => {
    const view = usageWidget(usage({ balance: -4, periodCredits: 100, periodUsed: 100 }), trial, now);
    expect(view.headline).toBe("Trial: 5 days left, 0 of 100 credits left");
    expect(view.showBuyCredits).toBe(true);
  });

  it("mentions top-up credits and falls back to a plain balance with no plan grant", () => {
    const view = usageWidget(usage({ balance: 500, topupRemaining: 500, periodCredits: 0, periodUsed: 0 }), active, now);
    expect(view.headline).toBe("500 credits left");
    expect(view.percentUsed).toBeNull();
    expect(view.details).toEqual(["Includes 500 top-up credits"]);
  });

  it("keeps top-up credits out of the trial's plan number (BUG-6)", () => {
    const view = usageWidget(usage({ balance: 1664, topupRemaining: 500, periodCredits: 1200, periodUsed: 36 }), trial, now);
    expect(view.headline).toBe("Trial: 5 days left, 1,164 of 1,200 credits left");
    expect(view.details).toEqual(["Plus 500 top-up credits"]);
  });

  it("takes credits held for a running scan from the plan before the top-up", () => {
    // 1,164 plan and 500 top-up remaining, 36 held.
    const view = usageWidget(usage({ balance: 1628, topupRemaining: 500, periodCredits: 1200, periodUsed: 36 }), trial, now);
    expect(view.headline).toBe("Trial: 5 days left, 1,128 of 1,200 credits left");
    expect(view.details).toEqual(["Plus 500 top-up credits"]);
  });

  it("does not count a held top-up credit as left", () => {
    // Plan used up, 1 top-up credit left but held for a scan.
    const view = usageWidget(usage({ balance: 0, topupRemaining: 1, periodCredits: 1200, periodUsed: 1200 }), trial, now);
    expect(view.headline).toBe("Trial: 5 days left, 0 of 1,200 credits left");
    expect(view.details).toEqual(["No credits left"]);
  });

  it("shows only the overdraft when over, even with top-up grants on record", () => {
    const view = usageWidget(usage({ balance: -12, topupRemaining: 5, periodCredits: 1200, periodUsed: 1200 }), active, now);
    expect(view.tone).toBe("empty");
    expect(view.details).toEqual(["12 credits over", "Renews in 12 days"]);
  });

  it("lists top-up credits separately on a paid plan", () => {
    const view = usageWidget(usage({ balance: 780, topupRemaining: 200, periodUsed: 620 }), active, now);
    expect(view.headline).toBe("620 of 1,200 credits used");
    expect(view.details).toEqual(["Renews in 12 days", "Plus 200 top-up credits"]);
  });

  it("lists admin or promo credits beyond the plan as extra", () => {
    const view = usageWidget(usage({ balance: 150, periodCredits: 100, periodUsed: 0 }), trial, now);
    expect(view.headline).toBe("Trial: 5 days left, 100 of 100 credits left");
    expect(view.details).toEqual(["Plus 50 extra credits"]);
  });

  it("says renews tomorrow and trial ends today at the edges", () => {
    expect(usageWidget(usage({}), { ...active, periodEndsAt: inDays(0.5) }, now).details).toEqual(["Renews tomorrow"]);
    expect(
      usageWidget(usage({ balance: 10, periodCredits: 100 }), { ...trial, trialEndsAt: inDays(0) }, now).headline,
    ).toBe("Trial ends today, 10 of 100 credits left");
  });
});

describe("test mode banner (D-61)", () => {
  it("comes first on every page of a test agency, above billing banners, and never for a real one", () => {
    const banners = pickBanners(usage({ balance: 0 }), { ...active, status: "past_due", isTest: true }, now);
    expect(banners[0]).toEqual({ kind: "test_mode", tone: "warning", message: TEST_MODE_MESSAGE, action: null });
    expect(banners.map((b) => b.kind)).toContain("past_due");
    expect(pickBanners(usage({}), { ...active, isTest: true }, now).map((b) => b.kind)).toEqual(["test_mode"]);
    expect(pickBanners(usage({}), active, now).some((b) => b.kind === "test_mode")).toBe(false);
    expect(TEST_MODE_MESSAGE).toBe("Test mode: these are sample AI answers, not real results. Scores are not real.");
  });
});

describe("pickBanners", () => {
  const kinds = (u: UsageNumbers, a: AccountState) => pickBanners(u, a, now).map((b) => b.kind);

  it("shows nothing for a healthy paid account", () => {
    expect(kinds(usage({}), active)).toEqual([]);
  });

  it("warns at 80% of the period's credits, before they run out (MVP_SPEC 4.2)", () => {
    const at80 = usage({ balance: 200, topupRemaining: 0, periodCredits: 1_000, periodUsed: 800 });
    expect(pickBanners(at80, active, now)).toContainEqual({
      kind: "low_credits",
      tone: "warning",
      message: "Only 200 credits left this period. Scans pause when they run out.",
      action: { label: "Buy credits", href: BUY_CREDITS_HREF },
    });
    expect(kinds(usage({ balance: 210, topupRemaining: 0, periodCredits: 1_000, periodUsed: 790 }), active)).not.toContain("low_credits");
    // Plenty of top-up credits left: no warning, though the plan's credits are 90% used.
    expect(kinds(usage({ balance: 600, topupRemaining: 500, periodCredits: 1_000, periodUsed: 900 }), active)).not.toContain("low_credits");
    // At 0 the out of credits banner says it instead.
    expect(kinds(usage({ balance: 0, topupRemaining: 0, periodCredits: 1_000, periodUsed: 1_000 }), active)).toEqual(["out_of_credits"]);
  });

  const trialUsage = usage({ balance: 564, topupRemaining: 500, periodCredits: 100, periodUsed: 36 });

  it("shows days and trial credits left and the charge date during the trial", () => {
    expect(pickBanners(trialUsage, trial, now)).toEqual([
      {
        kind: "trial",
        tone: "info",
        message: "Your free trial has 5 days and 64 trial credits left. Your card will be charged on October 2.",
        action: null,
      },
    ]);
    const lastDay = pickBanners(usage({ balance: 1, periodCredits: 100 }), { ...trial, trialEndsAt: inDays(0) }, now).find((b) => b.kind === "trial")!;
    expect(lastDay.message).toBe("Your free trial ends today, with 1 trial credit left. Your card will be charged on September 27.");
  });

  it("dates the charge in the viewer's time zone, like Billing (BUG-111)", () => {
    const late = { ...trial, trialEndsAt: new Date("2026-10-17T02:00:00Z") };
    expect(pickBanners(trialUsage, late, now)[0].message).toMatch(/charged on October 17\.$/);
    expect(pickBanners(trialUsage, late, now, "America/Los_Angeles")[0].message).toMatch(/charged on October 16\.$/);
  });

  it("says nothing will be charged once the trial is cancelled", () => {
    const cancelled = { ...trial, cancelAt: trial.trialEndsAt };
    expect(pickBanners(trialUsage, cancelled, now)[0]).toEqual({
      kind: "trial",
      tone: "info",
      message: "Your free trial has 5 days and 64 trial credits left. Your trial ends on October 2. You won't be charged.",
      action: { label: "Keep my plan", href: BILLING_HREF },
    });
    const lastDay = pickBanners(trialUsage, { ...cancelled, trialEndsAt: inDays(0) }, now)[0];
    expect(lastDay.message).toBe("Your free trial ends today, with 64 trial credits left. You won't be charged.");
  });

  it("shows only the read only notice once a cancelled trial or plan has ended", () => {
    const endedTrial: AccountState = { status: "canceled", trialEndsAt: inDays(-2), periodEndsAt: inDays(-2), cancelAt: null };
    expect(pickBanners(usage({ balance: 0 }), endedTrial, now)).toEqual([
      {
        kind: "ended",
        tone: "warning",
        message: "Your free trial has ended and you weren't charged. Your results are still here to read, but new scans are off.",
        action: { label: "Choose a plan", href: CHOOSE_PLAN_HREF },
      },
    ]);
    const endedPlan: AccountState = { ...endedTrial, trialEndsAt: inDays(-40), periodEndsAt: inDays(-2) };
    expect(pickBanners(usage({ balance: 500 }), endedPlan, now)[0].message).toBe(
      "Your plan has ended. Your results are still here to read, but new scans are off.",
    );
  });

  it("orders past due before out of credits", () => {
    expect(kinds(usage({ balance: -3 }), { ...active, status: "past_due" })).toEqual(["past_due", "out_of_credits"]);
  });

  it("links the out of credits banner to buying credits", () => {
    const [banner] = pickBanners(usage({ balance: 0 }), active, now);
    expect(banner.action).toEqual({ label: "Buy credits", href: BUY_CREDITS_HREF });
  });

  it("does not say out of credits for a trial whose first credits are still being added", () => {
    const freshTrial: AccountState = { ...trial, trialEndsAt: inDays(7) };
    const none = usage({ balance: 0, periodCredits: 0, periodUsed: 0 });
    expect(kinds(none, freshTrial)).toEqual(["trial"]);
    expect(pickBanners(none, freshTrial, now)[0].message).toContain("Your free trial has 7 days. Your trial credits are being added.");
    // Right after the card is accepted, the trial end is not saved yet.
    expect(kinds(none, { ...trial, trialEndsAt: null })).toEqual([]);
    // A trial that did get credits and spent them all is out of credits.
    expect(kinds(usage({ balance: 0, periodCredits: 100, periodUsed: 100 }), freshTrial)).toEqual(["out_of_credits", "trial"]);
  });

  it("shows only the suspended banner for a paused account", () => {
    expect(kinds(usage({ balance: 0 }), { ...active, status: "suspended" })).toEqual(["suspended"]);
  });
});

describe("shortBalance", () => {
  it("formats the phone top bar balance", () => {
    expect(shortBalance(1580)).toEqual({ text: "1,580 credits", empty: false });
    expect(shortBalance(1)).toEqual({ text: "1 credit", empty: false });
    expect(shortBalance(0)).toEqual({ text: "0 credits", empty: true });
    expect(shortBalance(-31)).toEqual({ text: "31 over", empty: true });
  });
});
