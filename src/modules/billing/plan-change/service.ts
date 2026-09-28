import type Stripe from "stripe";
import { planInvoiceGrants, type PlanCredits } from "../webhooks/credits";
import type { PlanChangeStripe } from "./client";
import { doneCopy, previewCopy, type Copy } from "./copy";
import {
  buildPhases,
  checkChange,
  currentItems,
  idempotencyKey,
  itemSpec,
  periodEnd,
  phasesOf,
  PlanChangeError,
  previewItemsFor,
  scheduleIdOf,
  subscriptionItemsFor,
  timingOf,
  type CheckedChange,
  type PlanChange,
  type PlanChangeContext,
  type Timing,
} from "./planner";

// Previews and applies plan changes (MVP_SPEC 11.5, D-57). Changes made now invoice the proration at once;
// credits for it are granted by the invoice.paid webhook (B-42), never here. Period-end changes go on a
// subscription schedule; cancel uses cancel_at_period_end.

export type PlanChangeDeps = {
  stripe: PlanChangeStripe;
  plansByProduct: Map<string, PlanCredits>;
  now: () => Date;
};

export type PlanChangePreview = Copy & {
  timing: Timing;
  effectiveAt: string;
  amountCents: number;
  extraCredits: number;
  /** Send back to confirm: the charge then matches this preview (Stripe proration_date). */
  previewedAt: number;
};

export type PlanChangeDone = { message: string };

// A preview older than this has to be shown again, so the amount charged is the amount the user saw.
export const PREVIEW_MAX_AGE_SECONDS = 15 * 60;

type Loaded = { sub: Stripe.Subscription; schedule: Stripe.SubscriptionSchedule | null };

async function load(ctx: PlanChangeContext, deps: PlanChangeDeps): Promise<Loaded> {
  if (!ctx.subscriptionId) throw new PlanChangeError(409, "You don't have a plan yet. Finish checkout first.");
  const sub = await deps.stripe.retrieveSubscription(ctx.subscriptionId);
  const scheduleId = scheduleIdOf(sub);
  const schedule = scheduleId ? await deps.stripe.retrieveSchedule(scheduleId) : null;
  return { sub, schedule: schedule && schedule.status === "active" ? schedule : null };
}

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

function schedulePhases(sub: Stripe.Subscription, schedule: Stripe.SubscriptionSchedule, checked: CheckedChange) {
  const { current, next } = phasesOf(schedule);
  return buildPhases(
    sub,
    { start: current.start_date, end: current.end_date, items: current.items.map(itemSpec) },
    next ? next.items.map(itemSpec) : null,
    checked,
  );
}

function effectiveAt(timing: Timing, sub: Stripe.Subscription, nowSeconds: number): number {
  return timing === "now" ? nowSeconds : periodEnd(sub);
}

function previewParams(
  { sub, schedule }: Loaded,
  checked: CheckedChange,
  prorationDate: number,
): Stripe.InvoiceCreatePreviewParams | null {
  const kind = checked.change.kind;
  if (kind === "cancel" || kind === "keep") return null;
  const proration_behavior = timingOf(kind) === "now" ? "always_invoice" : "none";
  if (schedule) {
    return { schedule: schedule.id, schedule_details: { phases: schedulePhases(sub, schedule, checked), proration_behavior } };
  }
  return {
    subscription: sub.id,
    subscription_details: {
      items: previewItemsFor(checked),
      proration_behavior,
      ...(proration_behavior === "always_invoice" ? { proration_date: prorationDate } : {}),
    },
  };
}

export async function previewPlanChange(
  ctx: PlanChangeContext,
  change: PlanChange,
  deps: PlanChangeDeps,
): Promise<PlanChangePreview> {
  const loaded = await load(ctx, deps);
  const checked = checkChange(ctx, loaded.sub, change);
  const now = deps.now();
  const previewedAt = seconds(now);
  const timing = timingOf(change.kind);
  const trialing = loaded.sub.status === "trialing";

  const params = previewParams(loaded, checked, previewedAt);
  const invoice = params ? await deps.stripe.previewInvoice(params) : null;
  const extraCredits =
    invoice && timing === "now" && !trialing
      ? planInvoiceGrants(invoice, invoice.lines.data, deps.plansByProduct, now).reduce((sum, g) => sum + g.amount, 0)
      : 0;
  const at = effectiveAt(timing, loaded.sub, previewedAt);

  return {
    ...previewCopy({
      change,
      trialing,
      businessName: checked.business?.name ?? null,
      planName: checked.plan?.name ?? null,
      planPriceCents: checked.plan?.priceCents ?? null,
      amountCents: invoice?.amount_due ?? 0,
      extraCredits,
      effectiveAt: timing === "now" && trialing ? periodEnd(loaded.sub) : at,
    }),
    timing,
    effectiveAt: new Date(at * 1000).toISOString(),
    amountCents: invoice?.amount_due ?? 0,
    extraCredits,
    previewedAt,
  };
}

export async function applyPlanChange(
  ctx: PlanChangeContext,
  change: PlanChange,
  previewedAt: number,
  deps: PlanChangeDeps,
): Promise<PlanChangeDone> {
  const nowSeconds = seconds(deps.now());
  if (previewedAt > nowSeconds + 60 || nowSeconds - previewedAt > PREVIEW_MAX_AGE_SECONDS) {
    throw new PlanChangeError(409, "That price was shown a while ago. Check the new amount and confirm again.");
  }
  const loaded = await load(ctx, deps);
  const { sub, schedule } = loaded;
  const checked = checkChange(ctx, sub, change);
  const key = idempotencyKey(ctx.agencyId, change, previewedAt);
  const timing = timingOf(change.kind);

  if (change.kind === "cancel" || change.kind === "keep") {
    // A cancel replaces any pending downgrade or removal, so the schedule goes first.
    if (change.kind === "cancel" && schedule) await deps.stripe.releaseSchedule(schedule.id, `${key}:release`);
    await deps.stripe.updateSubscription(sub.id, { cancel_at_period_end: change.kind === "cancel" }, `${key}:subscription`);
  } else if (schedule) {
    await deps.stripe.updateSchedule(
      schedule.id,
      {
        phases: schedulePhases(sub, schedule, checked),
        ...(timing === "now" ? { proration_behavior: "always_invoice" as const } : {}),
      },
      `${key}:schedule`,
    );
  } else if (timing === "now") {
    await deps.stripe.updateSubscription(
      sub.id,
      {
        items: subscriptionItemsFor(checked),
        proration_behavior: "always_invoice",
        proration_date: previewedAt,
        // A declined card leaves the plan as it was instead of a change the user hasn't paid for.
        payment_behavior: "error_if_incomplete",
      },
      `${key}:subscription`,
    );
  } else {
    const created = await deps.stripe.createScheduleFromSubscription(sub.id, `${key}:create`);
    const first = created.phases[0];
    await deps.stripe.updateSchedule(
      created.id,
      {
        end_behavior: "release",
        phases: buildPhases(sub, { start: first.start_date, end: first.end_date, items: currentItems(ctx, sub) }, null, checked),
      },
      `${key}:schedule`,
    );
  }

  return {
    message: doneCopy({
      change,
      businessName: checked.business?.name ?? null,
      planName: checked.plan?.name ?? null,
      effectiveAt: effectiveAt(timing, sub, nowSeconds),
    }),
  };
}
