// Pure rules for the app frame: the usage widget text and which banners show (MVP_SPEC 8.2, B-48).
import { customerDate } from "@/lib/time-zone";
import { daysUntil, renewsText } from "./days";

export { daysUntil } from "./days";
import { TEST_MODE_MESSAGE } from "@/lib/test-mode";

const WARN_AT_PERCENT = 80;

export const BILLING_HREF = "/settings/billing";
/** Choose a plan when the agency has none or its plan ended (BUG-079, BUG-066). */
export const CHOOSE_PLAN_HREF = "/settings/billing/plans";
/** Pick a plan before setting up a business after the first; carried into the wizard as ?plan=. */
export const NEW_BUSINESS_PLAN_HREF = "/settings/billing/plans/new-business";
export const BUY_CREDITS_HREF = "/settings/credits";
export const SUPPORT_HREF = "/contact?topic=support";

export type AccountState = {
  status: string;
  trialEndsAt: Date | null;
  periodEndsAt: Date | null;
  /** A pending cancel's date: the subscription ends then and nothing more is charged. */
  cancelAt: Date | null;
  /** Test mode (agencies.is_test, D-61): scans use sample answers, so every page says so. */
  isTest?: boolean;
};

export type UsageNumbers = {
  balance: number;
  topupRemaining: number;
  periodCredits: number;
  periodUsed: number;
};

export type UsageWidgetView = {
  tone: "normal" | "warning" | "empty";
  headline: string;
  /** Share of this period's credits used, 0 to 100, for the progress bar. Null when there is no period total. */
  percentUsed: number | null;
  details: string[];
  showBuyCredits: boolean;
  /** A failed payment: the widget says so and links to Billing instead of a renewal date that won't happen. */
  paymentFailed: { text: string; href: string } | null;
};

/** The subscription's last charge failed (Stripe past_due, or unpaid after the retries ran out). */
export const PAYMENT_FAILED_STATUSES = ["past_due", "unpaid"];

export type Banner = {
  kind: "test_mode" | "suspended" | "past_due" | "out_of_credits" | "low_credits" | "trial" | "ended";
  tone: "danger" | "warning" | "info";
  message: string;
  action: { label: string; href: string } | null;
};

const count = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) => `${count(n)} ${word}${n === 1 ? "" : "s"}`;

function trialText(days: number): string {
  return days === 0 ? "Trial ends today" : `Trial: ${plural(days, "day")} left`;
}

export function isTrial(account: AccountState): boolean {
  return account.status === "trialing" && account.trialEndsAt !== null;
}

/** The trial end date has passed but Stripe has not confirmed the first payment yet: scans are paused (entitlements). */
export function trialOver(account: AccountState, now: Date): boolean {
  return isTrial(account) && account.trialEndsAt!.getTime() < now.getTime();
}

/**
 * Splits what can still be spent into this period's plan credits and the rest (top-ups, or admin and
 * promo grants). Plan credits expire first so they are spent first, and credits held for a running scan
 * or overdrawn come out of them before any top-up credit (MVP_SPEC 4.2).
 */
export function splitCredits(usage: UsageNumbers): { plan: number; topup: number; other: number } {
  const spendable = Math.max(0, usage.balance);
  const topup = Math.min(usage.topupRemaining, spendable);
  const plan = Math.min(spendable - topup, usage.periodCredits);
  return { plan, topup, other: spendable - topup - plan };
}

export function usageWidget(usage: UsageNumbers, account: AccountState, now: Date): UsageWidgetView {
  const { balance, periodCredits, periodUsed } = usage;
  const percentUsed = periodCredits > 0 ? Math.min(100, Math.round((periodUsed / periodCredits) * 100)) : null;
  const empty = balance <= 0;
  const tone = empty ? "empty" : percentUsed !== null && percentUsed >= WARN_AT_PERCENT ? "warning" : "normal";
  const details: string[] = [];
  const { plan, topup, other } = splitCredits(usage);
  const hasPlan = periodCredits > 0;
  const paymentFailed = PAYMENT_FAILED_STATUSES.includes(account.status);

  let headline: string;
  if (trialOver(account, now)) {
    headline = "Trial ended, waiting for your first payment";
  } else if (isTrial(account)) {
    headline = `${trialText(daysUntil(account.trialEndsAt!, now))}, ${count(plan)} of ${count(periodCredits)} credits left`;
  } else if (hasPlan) {
    headline = `${count(periodUsed)} of ${count(periodCredits)} credits used`;
    // Past due, the plan does not renew until the card is fixed, so no renewal date is shown.
    if (account.periodEndsAt && !paymentFailed) details.push(renewsText(daysUntil(account.periodEndsAt, now)));
  } else {
    headline = `${plural(Math.max(0, balance), "credit")} left`;
  }

  if (balance < 0) details.unshift(`${plural(-balance, "credit")} over`);
  else if (balance === 0 && !trialOver(account, now)) details.unshift("No credits left");
  // The headline counts plan credits only, so anything else is listed on its own line.
  if (topup > 0) details.push(`${hasPlan ? "Plus" : "Includes"} ${plural(topup, "top-up credit")}`);
  if (other > 0 && hasPlan) details.push(`Plus ${plural(other, "extra credit")}`);

  return {
    tone,
    headline,
    percentUsed,
    details,
    // A failed payment comes first: buying credits does not help while scans are paused. Nor after the trial ends.
    showBuyCredits: empty && !paymentFailed && !trialOver(account, now),
    paymentFailed: paymentFailed ? { text: "Payment failed. Update your card", href: BILLING_HREF } : null,
  };
}

/** In the viewer's zone, like the dates the pages format themselves (BUG-111); UTC when unknown. */
function formatDate(date: Date, timeZone: string): string {
  return customerDate(date, timeZone, { month: "long", day: "numeric" });
}

/** Days and trial credits left, then the charge date, or that nothing is charged after a cancel (B-45, MVP_SPEC 4.4). */
function trialBanner(usage: UsageNumbers, account: AccountState, now: Date, timeZone: string): Banner {
  const days = daysUntil(account.trialEndsAt!, now, timeZone);
  const credits = plural(splitCredits(usage).plan, "trial credit");
  const adding = usage.periodCredits === 0 && usage.balance === 0 && usage.periodUsed === 0;
  const timeLeft = days === 0 ? `Your free trial ends today, with ${credits} left.` : `Your free trial has ${plural(days, "day")} and ${credits} left.`;
  const left = adding ? `Your free trial has ${plural(days, "day")}. Your trial credits are being added.` : timeLeft;
  const date = formatDate(account.trialEndsAt!, timeZone);
  if (account.cancelAt) {
    return {
      kind: "trial",
      tone: "info",
      message: `${left} ${days === 0 ? "" : `Your trial ends on ${date}. `}You won't be charged.`,
      action: { label: "Keep my plan", href: BILLING_HREF },
    };
  }
  return { kind: "trial", tone: "info", message: `${left} Your card will be charged on ${date}.`, action: null };
}

/** A plan that ended at or before its trial end was a cancelled trial: nothing was ever charged. */
function endedBanner(account: AccountState): Banner {
  const { trialEndsAt, periodEndsAt } = account;
  const wasTrial = trialEndsAt !== null && (periodEndsAt === null || periodEndsAt <= trialEndsAt);
  return {
    kind: "ended",
    tone: "warning",
    message: `${wasTrial ? "Your free trial has ended and you weren't charged." : "Your plan has ended."} Your results are still here to read, but new scans are off.`,
    // BUG-066: the way back is choosing a plan on this site, not contacting us.
    action: { label: "Choose a plan", href: CHOOSE_PLAN_HREF },
  };
}

/** Most urgent first. */
export function pickBanners(usage: UsageNumbers, account: AccountState, now: Date, timeZone = "UTC"): Banner[] {
  const banners = accountBanners(usage, account, now, timeZone);
  // First, above any billing banner: nothing on a test agency's pages is a real result.
  return account.isTest ? [{ kind: "test_mode", tone: "warning", message: TEST_MODE_MESSAGE, action: null }, ...banners] : banners;
}

function accountBanners(usage: UsageNumbers, account: AccountState, now: Date, timeZone: string): Banner[] {
  const banners: Banner[] = [];

  if (account.status === "suspended" || account.status === "deleted") {
    banners.push({
      kind: "suspended",
      tone: "danger",
      message: "Your account is paused. Scans and changes are on hold until support turns it back on.",
      action: { label: "Contact support", href: SUPPORT_HREF },
    });
    return banners;
  }

  // Read only (entitlements refuse scans and top-ups), so "buy credits" would only lead to a refusal.
  if (account.status === "canceled") return [endedBanner(account)];

  if (account.status === "past_due") {
    banners.push({
      kind: "past_due",
      tone: "danger",
      message: "Your last payment didn't go through. Update your card to keep your scans running.",
      action: { label: "Update card", href: BILLING_HREF },
    });
  }

  // Past the trial end with no payment confirmed: scans are paused for that reason, not for credits (entitlements).
  if (trialOver(account, now)) {
    banners.push({
      kind: "trial",
      tone: "warning",
      message: `Your free trial ended on ${formatDate(account.trialEndsAt!, timeZone)}. Scans are paused until your first payment goes through.`,
      action: { label: "Check billing", href: BILLING_HREF },
    });
    return banners;
  }

  // A plan (trial or paid) that has never been granted a credit is waiting for its first invoice to be paid (F-48),
  // not out of credits: right after setup the first-scan screen says "Adding your trial credits", not this banner.
  const creditsComing =
    (account.status === "trialing" || account.status === "active") &&
    usage.balance === 0 &&
    usage.periodCredits === 0 &&
    usage.periodUsed === 0 &&
    usage.topupRemaining === 0;
  if (usage.balance <= 0 && !creditsComing) {
    banners.push({
      kind: "out_of_credits",
      tone: "danger",
      message:
        usage.balance < 0
          ? `You used ${plural(-usage.balance, "credit")} more than you had. New scans are paused, and your next top-up or renewal pays this back first.`
          : "You're out of credits. New scans are paused until you add more.",
      action: { label: "Buy credits", href: BUY_CREDITS_HREF },
    });
  }

  // MVP_SPEC 4.2: a warning at 80% of the period's credits, before scans pause at 0. Top-ups left over keep it
  // quiet, so it shows only when what is left is also down to the last fifth.
  // Whole numbers: 1 - 0.8 is 0.19999... in floating point, so exactly 80% would be missed.
  const usedEnough = usage.periodUsed * 100 >= usage.periodCredits * WARN_AT_PERCENT;
  const low = usage.balance * 100 <= usage.periodCredits * (100 - WARN_AT_PERCENT);
  if (usage.balance > 0 && usage.periodCredits > 0 && usedEnough && low) {
    banners.push({
      kind: "low_credits",
      tone: "warning",
      message: `Only ${plural(usage.balance, "credit")} left this period. Scans pause when they run out.`,
      action: { label: "Buy credits", href: BUY_CREDITS_HREF },
    });
  }

  if (isTrial(account)) banners.push(trialBanner(usage, account, now, timeZone));

  return banners;
}

/** Compact balance for the phone top bar. */
export function shortBalance(balance: number): { text: string; empty: boolean } {
  if (balance < 0) return { text: `${count(-balance)} over`, empty: true };
  return { text: plural(balance, "credit"), empty: balance === 0 };
}
