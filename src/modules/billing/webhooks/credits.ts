import type Stripe from "stripe";

// Which credit grants a paid invoice earns (MVP_SPEC 4.2, 4.4, 11.3, 11.5, D-17, D-57). Pure: no database, env or Stripe calls.

/** D-17: 150 credits, one grant per trial, expiring when the trial ends. Earlier trials keep the 100 they were granted. */
export const TRIAL_CREDITS = 150;

export type PlanCredits = { planId: string; monthlyCredits: number };

export type PlannedGrant = {
  source: "plan" | "trial";
  /** Always a Stripe invoice line ID, so a replayed event can never grant twice (MVP_SPEC 11.3). */
  sourceId: string;
  amount: number;
  expiresAt: Date;
  reason: "trial_start" | "period" | "proration";
};

export function lineProductId(line: Stripe.InvoiceLineItem): string | null {
  const product = line.pricing?.price_details?.product;
  return typeof product === "string" ? product : null;
}

function subscriptionDetails(line: Stripe.InvoiceLineItem) {
  return line.parent?.type === "subscription_item_details" ? line.parent.subscription_item_details ?? null : null;
}

/** Stripe bills a month ending on the 31st from the last day of a shorter month, so the day is clamped the same way. */
export function monthBefore(end: Date): Date {
  const year = end.getUTCFullYear();
  const month = end.getUTCMonth() - 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(year, month, Math.min(end.getUTCDate(), lastDay), end.getUTCHours(), end.getUTCMinutes(), end.getUTCSeconds()),
  );
}

/**
 * Share of a monthly period a proration line covers: 15 of 30 days left is 0.5. `periodStart` is the billing period's
 * real start from Stripe; without it the start is worked out as a month before the end, which is wrong when the
 * billing day is the 29th to 31st (January 31 to February 28 is 28 days, not 31).
 */
export function periodFraction(period: { start: number; end: number }, periodStart?: number): number {
  const end = new Date(period.end * 1000);
  // A start after the line's own start belongs to a later period (an event replayed after the renewal).
  const start = periodStart !== undefined && periodStart <= period.start ? periodStart * 1000 : monthBefore(end).getTime();
  const full = end.getTime() - start;
  if (full <= 0) return 0;
  return Math.min(1, Math.max(0, (period.end - period.start) * 1000 / full));
}

/** True when the invoice has proration lines, the only grants that need the billing period's start. */
export function hasProrations(lines: Stripe.InvoiceLineItem[]): boolean {
  return lines.some((l) => subscriptionDetails(l)?.proration);
}

/**
 * For each proration line's item, the start of the billing period it is prorated against: the earliest start of the
 * subscription's items whose period ends when the line ends. So an item added mid-period (or not on the subscription
 * yet, in a preview) gets its cycle's start, and a period that has since renewed is not used.
 */
export function prorationPeriodStarts(
  items: Pick<Stripe.SubscriptionItem, "current_period_start" | "current_period_end">[],
  lines: Stripe.InvoiceLineItem[],
): Map<string, number> {
  const starts = new Map<string, number>();
  for (const line of lines) {
    const details = subscriptionDetails(line);
    if (!details?.proration) continue;
    const sameEnd = items.filter((i) => i.current_period_end === line.period.end).map((i) => i.current_period_start);
    if (sameEnd.length > 0) starts.set(details.subscription_item, Math.min(...sameEnd));
  }
  return starts;
}

function isTrialStart(invoice: Stripe.Invoice, lines: Stripe.InvoiceLineItem[]): boolean {
  return invoice.billing_reason === "subscription_create" && lines.length > 0 && lines.every((l) => l.amount === 0);
}

/**
 * Plans the grants for a paid subscription invoice.
 * - Trial start (a $0 first invoice): one trial grant, never plan credits.
 * - Period lines (signup without trial, renewal): the plan's monthly credits per business, expiring at period end.
 * - Prorations (upgrade, added business): per subscription item, credits of the new time minus credits of the
 *   unused time, e.g. Starter to Pro with 15 of 30 days left is (2,500 - 1,200) x 0.5 = +650. Downgrades never
 *   produce a negative grant; current grants stay until they expire.
 * Grants that would already be expired (a very late replay) are left out. Unknown products throw.
 * `periodStarts`: subscription item ID to the start of its current billing period, for prorations.
 */
export function planInvoiceGrants(
  invoice: Stripe.Invoice,
  lines: Stripe.InvoiceLineItem[],
  plans: Map<string, PlanCredits>,
  now: Date,
  periodStarts: ReadonlyMap<string, number> = new Map(),
): PlannedGrant[] {
  const subLines = lines.filter((l) => subscriptionDetails(l));
  const grants: PlannedGrant[] = [];

  if (isTrialStart(invoice, subLines)) {
    const first = subLines[0];
    grants.push({
      source: "trial",
      sourceId: first.id,
      amount: TRIAL_CREDITS,
      expiresAt: new Date(first.period.end * 1000),
      reason: "trial_start",
    });
    return grants.filter((g) => g.expiresAt > now);
  }

  const creditsFor = (line: Stripe.InvoiceLineItem) => {
    const product = lineProductId(line);
    const plan = product ? plans.get(product) : undefined;
    if (!plan) throw new Error(`invoice ${invoice.id} line ${line.id}: product ${product ?? "none"} is not a plan`);
    return plan.monthlyCredits * (line.quantity ?? 1);
  };

  const prorations = new Map<string, Stripe.InvoiceLineItem[]>();
  for (const line of subLines) {
    const details = subscriptionDetails(line)!;
    if (details.proration) {
      const group = prorations.get(details.subscription_item) ?? [];
      group.push(line);
      prorations.set(details.subscription_item, group);
    } else if (line.amount > 0) {
      grants.push({
        source: "plan",
        sourceId: line.id,
        amount: creditsFor(line),
        expiresAt: new Date(line.period.end * 1000),
        reason: "period",
      });
    }
  }

  for (const [itemId, group] of prorations) {
    const charged = group.filter((l) => l.amount > 0);
    if (charged.length === 0) continue;
    const start = periodStarts.get(itemId);
    const net = group.reduce((sum, l) => sum + Math.sign(l.amount) * creditsFor(l) * periodFraction(l.period, start), 0);
    const amount = Math.round(net);
    if (amount <= 0) continue;
    const anchor = charged.reduce((a, b) => (b.amount > a.amount ? b : a));
    grants.push({
      source: "plan",
      sourceId: anchor.id,
      amount,
      expiresAt: new Date(anchor.period.end * 1000),
      reason: "proration",
    });
  }

  return grants.filter((g) => g.expiresAt > now);
}
