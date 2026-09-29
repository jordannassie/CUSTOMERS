import { describe, expect, it } from "vitest";
import { BUY_CREDITS_HREF, pickBanners, shortBalance, usageWidget, type AccountState, type UsageNumbers } from "./service";

const now = new Date("2026-09-27T12:00:00Z");
const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const active: AccountState = { status: "active", trialEndsAt: null, periodEndsAt: inDays(12) };
const trial: AccountState = { status: "trialing", trialEndsAt: inDays(5), periodEndsAt: null };
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
    });
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
      usageWidget(usage({ balance: 10, periodCredits: 100 }), { ...trial, trialEndsAt: inDays(-1) }, now).headline,
    ).toBe("Trial ends today, 10 of 100 credits left");
  });
});

describe("pickBanners", () => {
  const kinds = (u: UsageNumbers, a: AccountState) => pickBanners(u, a, now).map((b) => b.kind);

  it("shows nothing for a healthy paid account", () => {
    expect(kinds(usage({}), active)).toEqual([]);
  });

  it("shows the trial banner with the charge date", () => {
    const [banner] = pickBanners(usage({}), trial, now);
    expect(banner.message).toBe("Your free trial ends in 5 days. Your card will be charged on October 2.");
  });

  it("orders past due before out of credits", () => {
    expect(kinds(usage({ balance: -3 }), { ...active, status: "past_due" })).toEqual(["past_due", "out_of_credits"]);
  });

  it("links the out of credits banner to buying credits", () => {
    const [banner] = pickBanners(usage({ balance: 0 }), active, now);
    expect(banner.action).toEqual({ label: "Buy credits", href: BUY_CREDITS_HREF });
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
