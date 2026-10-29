import type Stripe from "stripe";
import { formatCount, formatUsd } from "../format";
import type { PlanChangeStripe } from "../plan-change/client";
import { formatDate } from "../plan-change/copy";
import { currentItems, itemSpec, phasesOf, PlanChangeError, scheduleIdOf, type ItemSpec, type PlanChangeContext } from "../plan-change/planner";
import { phasesFrom, scheduleAgain } from "../plan-change/schedule-now";
import type { PlanCredits } from "../webhooks/credits";
import type { StripeSync } from "../webhooks/sync";
import { itemsToMatchPhase } from "./phase-items";

// Start the paid plan before the trial ends (D-16, MVP_SPEC 4.4): a trial covers 2 businesses, so a 3rd needs the
// plan to start. Stripe ends the trial now, restarts the billing period today and charges the full month at once.
// Then `sync` reads the subscription and its latest invoice back from Stripe and applies them with the webhook's own
// handlers (A1, 2026-10-15), so the plan starts even when invoice.paid is missed; the webhook later changes nothing.

export type EndTrialDeps = {
  stripe: PlanChangeStripe;
  plansByProduct: Map<string, PlanCredits>;
  now: () => Date;
  /** For the dates in the sentences; UTC when unknown. */
  timeZone?: string;
  /** Applies the subscription and its paid invoice from Stripe like the webhooks (webhooks/sync.ts). */
  sync?: (subscriptionId: string) => Promise<StripeSync>;
  /** Admin alert when a declined card left the scheduled change lost (plan-change/dal.ts raiseScheduleLost). */
  onScheduleLost?: (message: string) => Promise<void>;
};

export type PlanNowOffer = {
  amountCents: number;
  credits: number;
  businessCount: number;
  /** What happens, one sentence each, in the order the page shows them. */
  lines: string[];
};

/** `started`: the plan is saved as active here and its credits are granted, so setup can go on now. */
export type PlanNowDone = { alreadyActive: boolean; started: boolean };

export const DECLINED =
  "Your card was declined, so nothing was charged and your trial goes on. Update your card with Manage card and invoices on Billing, then try again.";

type Loaded = { sub: Stripe.Subscription; schedule: Stripe.SubscriptionSchedule | null };

async function load(ctx: PlanChangeContext, deps: EndTrialDeps): Promise<Loaded> {
  if (!ctx.subscriptionId) throw new PlanChangeError(409, "You don't have a plan yet. Finish checkout first.");
  const sub = await deps.stripe.retrieveSubscription(ctx.subscriptionId);
  const scheduleId = scheduleIdOf(sub);
  const schedule = scheduleId ? await deps.stripe.retrieveSchedule(scheduleId) : null;
  return { sub, schedule: schedule && schedule.status === "active" ? schedule : null };
}

/** A cancelled trial ends with no charge; it is set to end by cancel_at_period_end, or by a schedule (BUG-124). */
function endsWithoutPlan({ sub, schedule }: Loaded): boolean {
  return sub.cancel_at_period_end || Boolean(sub.cancel_at) || schedule?.end_behavior === "cancel";
}

function refuseUnlessTrialing(loaded: Loaded) {
  if (loaded.sub.status !== "trialing") throw new PlanChangeError(409, "Your trial has already ended, so there is no trial to end.");
  if (endsWithoutPlan(loaded)) {
    throw new PlanChangeError(409, "Your plan is set to end with your trial. Choose Keep my plan on Billing first, then start your plan.");
  }
}

type Charged = { product: string | null; unitAmount: number; quantity: number };

function charged(price: string | Stripe.Price | Stripe.DeletedPrice, quantity: number | undefined): Charged {
  // The subscription's items always carry the price; schedule phases are read with prices expanded (client.ts).
  if (typeof price === "string" || price.deleted) throw new Error(`price ${typeof price === "string" ? price : price.id} not expanded`);
  const product = typeof price.product === "string" ? price.product : price.product?.id ?? null;
  return { product, unitAmount: price.unit_amount ?? 0, quantity: quantity ?? 1 };
}

/** The items the first paid month bills: a change scheduled for the trial end happens now (see endTrialNow). */
function chargedItems({ sub, schedule }: Loaded): Charged[] {
  const next = schedule ? phasesOf(schedule).next : null;
  if (next) return next.items.map((i) => charged(i.price, i.quantity));
  return sub.items.data.map((i) => charged(i.price, i.quantity));
}

/** One month after `seconds`, with the day clamped like Stripe (January 31 to February 28). */
export function monthLater(seconds: number): number {
  const d = new Date(seconds * 1000);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0)).getUTCDate();
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, Math.min(d.getUTCDate(), lastDay), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  return Math.floor(next / 1000);
}

/** What starting the plan today costs and adds, for the box on the new-business plan page. */
export async function planNowOffer(ctx: PlanChangeContext, deps: EndTrialDeps): Promise<PlanNowOffer> {
  const loaded = await load(ctx, deps);
  refuseUnlessTrialing(loaded);
  const items = chargedItems(loaded);
  const amountCents = items.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);
  const credits = items.reduce((sum, i) => sum + (deps.plansByProduct.get(i.product ?? "")?.monthlyCredits ?? 0) * i.quantity, 0);
  const businessCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const now = Math.floor(deps.now().getTime() / 1000);
  const date = (seconds: number) => formatDate(seconds, deps.timeZone);
  const businesses = businessCount === 1 ? "1 business" : `${businessCount} businesses`;

  const lines = [
    loaded.sub.trial_end ? `Your trial ends today instead of on ${date(loaded.sub.trial_end)}.` : "Your trial ends today.",
    `We charge the card on file ${formatUsd(amountCents)} today for the ${businesses} on your plan. Your next charge is on ${date(monthLater(now))}.`,
    `${formatCount(credits)} credits are added for the month. Your remaining trial credits are replaced by your plan credits.`,
  ];
  if (loaded.schedule && phasesOf(loaded.schedule).next) lines.push("Changes you scheduled for the end of your trial happen today.");
  return { amountCents, credits, businessCount, lines };
}

/** Applies what Stripe now says; true once it is paid and active. Without a sync (fixtures) the webhook does it. */
async function synced(sub: Stripe.Subscription, deps: EndTrialDeps): Promise<boolean> {
  if (!deps.sync) return false;
  try {
    const result = await deps.sync(sub.id);
    return result.paid && result.status === "active";
  } catch (error) {
    // The charge went through; the page's status check syncs again, so this never fails the request.
    console.error("[billing/end-trial] sync after the charge failed", error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Two clicks at once share one try, so Stripe is asked once (the idempotency key also covers other instances).
const inFlight = new Map<string, Promise<PlanNowDone>>();

/**
 * Ends the trial now. Stripe refuses a new trial end on a subscription a schedule controls (A4), so a schedule is
 * released first, with nothing on the subscription changed yet. Then one subscription update ends the trial and, with
 * a change scheduled for the trial end (a downgrade or removal, D-57), puts the scheduled items in place too. It uses
 * payment_behavior error_if_incomplete, so Stripe applies all of it or none of it: a declined card changes nothing,
 * the schedule is made again as it was, and the trial goes on (BUG-282).
 * `attemptId` is new for each try, so a double click charges once and a retry after a decline is a new request.
 * When Stripe already shows the trial ended, nothing is charged again: it only syncs.
 */
export async function endTrialNow(ctx: PlanChangeContext, attemptId: string, deps: EndTrialDeps): Promise<PlanNowDone> {
  const key = `end-trial:${ctx.agencyId}:${attemptId}`;
  const running = inFlight.get(key);
  if (running) return running;
  const attempt = endTrial(ctx, key, deps).finally(() => inFlight.delete(key));
  inFlight.set(key, attempt);
  return attempt;
}

const isDecline = (error: unknown) => {
  const e = error as { type?: string; statusCode?: number } | null;
  return e?.type === "StripeCardError" || e?.statusCode === 402;
};

/** True while Stripe still shows the trial; when Stripe can't be read either, true, so the schedule is tried again. */
async function stillTrialing(subscriptionId: string, deps: EndTrialDeps): Promise<boolean> {
  const now = await deps.stripe.retrieveSubscription(subscriptionId).catch(() => null);
  return !now || now.status === "trialing";
}

/** The schedule as it was, so a declined card can put it back. */
type Saved = { current: ItemSpec[]; next: ItemSpec[]; endBehavior: Stripe.SubscriptionSchedule.EndBehavior; trialEnd: number };

async function restore(ctx: PlanChangeContext, sub: Stripe.Subscription, saved: Saved, key: string, deps: EndTrialDeps) {
  const restored = await scheduleAgain(deps.stripe, sub.id, `${key}:restore`, saved.endBehavior, (start, end) =>
    phasesFrom(start, end, saved.current, saved.next, saved.trialEnd),
  );
  if (restored) return;
  const staying = saved.next.map((i) => i.metadata.business_id).join(", ") || "none";
  const message = `A scheduled plan change on Stripe subscription ${sub.id} (agency ${ctx.agencyId}) was lost after a declined card on "Start my plan now". Put it back in Stripe: at the trial end only these businesses stay on the plan: ${staying}.`;
  await deps.onScheduleLost?.(message).catch((error) => console.error("[billing/end-trial] could not raise the alert", error));
}

async function endTrial(ctx: PlanChangeContext, key: string, deps: EndTrialDeps): Promise<PlanNowDone> {
  const loaded = await load(ctx, deps);
  const { sub, schedule } = loaded;
  // Already started (a second click, or a retry after the first went through): only bring this side up to date.
  if (sub.status === "active" && !endsWithoutPlan(loaded)) return { alreadyActive: true, started: await synced(sub, deps) };
  refuseUnlessTrialing(loaded);

  let saved: Saved | null = null;
  if (schedule) {
    const { current, next } = phasesOf(schedule);
    if (next) {
      const trialEnd = sub.trial_end ?? current.end_date;
      saved = { current: current.items.map(itemSpec), next: next.items.map(itemSpec), endBehavior: schedule.end_behavior, trialEnd };
    }
    await deps.stripe.releaseSchedule(schedule.id, `${key}:release`);
  }

  const specs = currentItems(ctx, sub);
  const live = sub.items.data.map((item, i) => ({ id: item.id, spec: specs[i] }));
  const params: Stripe.SubscriptionUpdateParams = saved
    ? { items: itemsToMatchPhase(live, saved.next), proration_behavior: "none", trial_end: "now", payment_behavior: "error_if_incomplete" }
    : { trial_end: "now", payment_behavior: "error_if_incomplete" };
  let updated: Stripe.Subscription;
  try {
    updated = await deps.stripe.updateSubscription(sub.id, params, `${key}:subscription`);
  } catch (error) {
    // A declined card changed nothing (the action maps it to DECLINED). After any other error Stripe may still have
    // applied the update, so the schedule goes back only while the trial is still running.
    if (saved && (isDecline(error) || (await stillTrialing(sub.id, deps)))) await restore(ctx, sub, saved, key, deps);
    throw error;
  }
  // error_if_incomplete answers a decline with a 402; anything else that is not active means it was not paid.
  if (updated.status !== "active") {
    if (saved) await restore(ctx, sub, saved, key, deps);
    throw new PlanChangeError(402, DECLINED);
  }
  return { alreadyActive: false, started: await synced(updated, deps) };
}
