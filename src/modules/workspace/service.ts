// Pure rules for the app frame: the usage widget text and which banners show (MVP_SPEC 8.2, B-48).

const DAY = 24 * 60 * 60 * 1000;
const WARN_AT_PERCENT = 80;

export const BILLING_HREF = "/settings/billing";
export const BUY_CREDITS_HREF = "/settings/credits";
export const SUPPORT_HREF = "/contact?topic=support";

export type AccountState = {
  status: string;
  trialEndsAt: Date | null;
  periodEndsAt: Date | null;
  /** A pending cancel's date: the subscription ends then and nothing more is charged. */
  cancelAt: Date | null;
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
};

export type Banner = {
  kind: "suspended" | "past_due" | "out_of_credits" | "trial" | "ended";
  tone: "danger" | "warning" | "info";
  message: string;
  action: { label: string; href: string } | null;
};

const count = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) => `${count(n)} ${word}${n === 1 ? "" : "s"}`;

export function daysUntil(date: Date, now: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / DAY));
}

function renewsText(days: number): string {
  if (days === 0) return "Renews today";
  if (days === 1) return "Renews tomorrow";
  return `Renews in ${days} days`;
}

function trialText(days: number): string {
  return days === 0 ? "Trial ends today" : `Trial: ${plural(days, "day")} left`;
}

export function isTrial(account: AccountState): boolean {
  return account.status === "trialing" && account.trialEndsAt !== null;
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

  let headline: string;
  if (isTrial(account)) {
    headline = `${trialText(daysUntil(account.trialEndsAt!, now))}, ${count(plan)} of ${count(periodCredits)} credits left`;
  } else if (hasPlan) {
    headline = `${count(periodUsed)} of ${count(periodCredits)} credits used`;
    if (account.periodEndsAt) details.push(renewsText(daysUntil(account.periodEndsAt, now)));
  } else {
    headline = `${plural(Math.max(0, balance), "credit")} left`;
  }

  if (balance < 0) details.unshift(`${plural(-balance, "credit")} over`);
  else if (balance === 0) details.unshift("No credits left");
  // The headline counts plan credits only, so anything else is listed on its own line.
  if (topup > 0) details.push(`${hasPlan ? "Plus" : "Includes"} ${plural(topup, "top-up credit")}`);
  if (other > 0 && hasPlan) details.push(`Plus ${plural(other, "extra credit")}`);

  return { tone, headline, percentUsed, details, showBuyCredits: empty };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

/** Days and trial credits left, then the charge date, or that nothing is charged after a cancel (B-45, MVP_SPEC 4.4). */
function trialBanner(usage: UsageNumbers, account: AccountState, now: Date): Banner {
  const days = daysUntil(account.trialEndsAt!, now);
  const credits = plural(splitCredits(usage).plan, "trial credit");
  const left = days === 0 ? `Your free trial ends today, with ${credits} left.` : `Your free trial has ${plural(days, "day")} and ${credits} left.`;
  const date = formatDate(account.trialEndsAt!);
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
    action: { label: "Contact us", href: SUPPORT_HREF },
  };
}

/** Most urgent first. */
export function pickBanners(usage: UsageNumbers, account: AccountState, now: Date): Banner[] {
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

  if (usage.balance <= 0) {
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

  if (isTrial(account)) banners.push(trialBanner(usage, account, now));

  return banners;
}

/** Compact balance for the phone top bar. */
export function shortBalance(balance: number): { text: string; empty: boolean } {
  if (balance < 0) return { text: `${count(-balance)} over`, empty: true };
  return { text: plural(balance, "credit"), empty: balance === 0 };
}
