import type Stripe from "stripe";
import { lineProductId, newPeriodStart, PERIOD_GRACE_MS, planInvoiceGrants } from "./credits";
import type { WebhookAgency } from "./dal";
import type { WebhookDeps } from "./handlers";
import { periodStartsFor } from "./stripe-reads";

// The credits a paid subscription invoice earns, and the trial credits it replaces (MVP_SPEC 4.4, 11.3, 11.5).
// Every grant is keyed by its invoice line, so each of these can run any number of times.

const idOf = (ref: string | { id?: string } | null | undefined) => (typeof ref === "string" ? ref : ref?.id ?? null);

export function invoiceSubscription(invoice: Stripe.Invoice) {
  const details = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
  return details ? { subscriptionId: idOf(details.subscription), agencyId: details.metadata?.agency_id ?? null } : null;
}

/** The credits a paid invoice earns. Every grant is keyed by its invoice line, so running it twice grants once. */
export async function grantInvoice(deps: WebhookDeps, invoice: Stripe.Invoice, agency: WebhookAgency) {
  const lines = invoice.lines.has_more ? await deps.stripe.listInvoiceLines(invoice.id!) : invoice.lines.data;
  const plans = await deps.store.plansByProduct();
  const periodStarts = await periodStartsFor(deps.stripe, invoiceSubscription(invoice)?.subscriptionId ?? null, invoice.id, lines);

  for (const grant of planInvoiceGrants(invoice, lines, plans, deps.now(), periodStarts)) {
    const { sourceId, amount, expiresAt } = grant;
    if (grant.source === "trial") await deps.store.grantTrial({ agencyId: agency.id, sourceId, amount, expiresAt });
    else await deps.store.grant({ agencyId: agency.id, source: grant.source, sourceId, amount, expiresAt });
  }
  // M6: the previous period's grants ran into their grace hours; with the new period's credits in, they end now.
  const periodStart = newPeriodStart(invoice, lines);
  if (periodStart) await deps.store.endPreviousPeriodGrants(agency.id, periodStart, PERIOD_GRACE_MS);
  const unknown = lines.filter((l) => l.parent?.type === "subscription_item_details" && !lineProductId(l));
  if (unknown.length) console.warn("[stripe/webhook] invoice lines without a product", invoice.id, unknown.map((l) => l.id));
}

/**
 * A trial that has ended ends its trial credits: they are replaced by the plan credits, as Billing says (2026-10-16).
 * Only once the plan is paid (M4): a first payment that failed (past_due) keeps the trial credits until they expire.
 * The paid invoice's plan credits are granted first (keyed by line, so invoice.paid grants nothing more), so the
 * balance never drops to 0 in between.
 */
export async function endTrialIfPaid(deps: WebhookDeps, sub: Stripe.Subscription, agency: WebhookAgency) {
  const trialEnd = new Date(sub.trial_end! * 1000);
  if (!(await deps.store.hasTrialGrantAfter(agency.id, trialEnd))) return;
  const latest = sub.latest_invoice;
  const invoiceId = idOf(latest);
  if (!invoiceId) return;
  const invoice = typeof latest === "object" && latest?.status ? latest : await deps.stripe.retrieveInvoice(invoiceId);
  if (invoice.status !== "paid") return;
  await grantInvoice(deps, invoice, agency);
  await deps.store.endTrialGrant(agency.id, trialEnd);
}
