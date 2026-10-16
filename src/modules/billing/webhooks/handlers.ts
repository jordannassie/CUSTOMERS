import type Stripe from "stripe";
import { lineProductId, planInvoiceGrants } from "./credits";
import type { AgencyStatus, BusinessItem, WebhookAgency, WebhookStore } from "./dal";
import { paymentFailedEmail, trialEndingEmail, type SendBillingEmail } from "./emails";
import { periodStartsFor, withBusinessIds } from "./stripe-reads";

// One handler per Stripe event (MVP_SPEC 11.3, 11.5, D-39, D-57). Everything outside comes in through deps,
// so fixture tests run them with no Stripe calls and no real email sends.

/** Stripe reads for the rare cases a payload is not enough. The route passes the real client; tests pass fakes. */
export type StripeReader = {
  retrieveSubscription(id: string): Promise<Stripe.Subscription>;
  listSubscriptionItems(subscriptionId: string): Promise<Stripe.SubscriptionItem[]>;
  listInvoiceLines(invoiceId: string): Promise<Stripe.InvoiceLineItem[]>;
  retrieveInvoice(id: string): Promise<Stripe.Invoice>;
  /** Price ID to business_id, from the line items of the Checkout Session that started the subscription. */
  checkoutBusinessIds(subscriptionId: string): Promise<Map<string, string>>;
  /** Writes business_id onto a subscription item, so plan changes find the item by its business. */
  tagItem(itemId: string, businessId: string): Promise<void>;
};

export type WebhookDeps = { store: WebhookStore; stripe: StripeReader; sendEmail: SendBillingEmail; now: () => Date };

const idOf = (ref: string | { id: string } | null | undefined) => (typeof ref === "string" ? ref : ref?.id ?? null);
const iso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

/** Null for statuses that should leave the agency as it is (a first payment still in progress). */
export function agencyStatusFor(status: Stripe.Subscription.Status): AgencyStatus | null {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return null;
  }
}

/**
 * BUG-106: the billing change is saved before the email. An email that can't go out (email not set up here) is
 * logged instead of failing the event, so Stripe stops retrying an event that has already been applied.
 */
async function notify(deps: WebhookDeps, input: Parameters<SendBillingEmail>[0]) {
  try {
    await deps.sendEmail(input);
  } catch (error) {
    console.error("[stripe/webhook] email not sent", input.type, error instanceof Error ? error.message : String(error));
  }
}

async function requireAgency(deps: WebhookDeps, ref: { agencyId?: string | null; customerId?: string | null }) {
  const agency = await deps.store.findAgency(ref);
  // Thrown so Stripe retries: checkout.session.completed may not have linked the customer yet.
  if (!agency) throw new Error(`no agency for ${ref.agencyId ?? ref.customerId ?? "event"}`);
  return agency;
}

/** When a pending cancel ends the subscription; null when none is pending or it has already ended. */
export function cancelAt(sub: Stripe.Subscription, currentPeriodEnd: number | null): string | null {
  if (sub.status === "canceled") return null;
  return iso(sub.cancel_at ?? (sub.cancel_at_period_end ? currentPeriodEnd : null));
}

/**
 * An event for a subscription other than the agency's saved one (a duplicate checkout, BUG-118) must not change the
 * agency: a cancelled duplicate would otherwise mark a paying agency and all its businesses canceled. A subscription
 * is linked when the agency has none yet (subscription.created can come before checkout.session.completed) or its
 * saved one has ended (the plan starts again).
 */
export function isOtherSubscription(agency: WebhookAgency, subscriptionId: string): boolean {
  if (!agency.subscriptionId || agency.subscriptionId === subscriptionId || agency.status === "canceled") return false;
  console.warn("[stripe/webhook] ignored: not the agency's subscription", agency.id, subscriptionId);
  return true;
}

async function syncSubscription(deps: WebhookDeps, sub: Stripe.Subscription, agency: WebhookAgency) {
  if (isOtherSubscription(agency, sub.id)) return;
  const items = sub.items.has_more ? await deps.stripe.listSubscriptionItems(sub.id) : sub.items.data;
  const plans = await deps.store.plansByProduct();
  const status = agencyStatusFor(sub.status);
  const periodEnds = items.map((i) => i.current_period_end).filter(Boolean);

  await deps.store.linkStripe(agency.id, { customerId: idOf(sub.customer), subscriptionId: sub.id });
  const currentPeriodEnd = periodEnds.length ? Math.max(...periodEnds) : null;
  await deps.store.updateAgency(agency.id, {
    status: status ?? undefined,
    trialEndsAt: iso(sub.trial_end),
    currentPeriodEnd: iso(currentPeriodEnd),
    cancelAt: cancelAt(sub, currentPeriodEnd),
  });
  if (!status) return;
  // A trial that ended early ("Start my plan now") ends its trial credits too: they are replaced by the plan credits,
  // as Billing says. At the planned trial end the grant already expires then, so this changes nothing (2026-10-16).
  if ((status === "active" || status === "past_due") && sub.trial_end) await deps.store.endTrialGrant(agency.id, new Date(sub.trial_end * 1000));
  // A whole-account cancel keeps each business's schedule, so scans resume if the agency subscribes again.
  if (status === "canceled") return deps.store.setBusinessStatus(agency.id, "canceled");

  const businessItems: BusinessItem[] = [];
  for (const item of await withBusinessIds(deps.stripe, sub.id, items)) {
    const plan = plans.get(idOf(item.price.product) ?? "");
    if (!plan) throw new Error(`subscription item ${item.id}: product is not a plan`);
    businessItems.push({
      businessId: item.metadata?.business_id ?? null,
      itemId: item.id,
      planId: plan.planId,
      periodEnd: iso(item.current_period_end),
    });
  }
  await deps.store.syncBusinessItems(agency.id, businessItems, status);
}

/** Links the customer and subscription to the agency; for a paid top-up, grants its credits (never expire). */
async function checkoutCompleted(deps: WebhookDeps, session: Stripe.Checkout.Session) {
  const agencyId = session.metadata?.agency_id ?? session.client_reference_id;
  const agency = await requireAgency(deps, { agencyId, customerId: idOf(session.customer) });

  if (session.mode === "subscription") {
    const subscriptionId = idOf(session.subscription);
    if (subscriptionId && isOtherSubscription(agency, subscriptionId)) return;
    await deps.store.linkStripe(agency.id, { customerId: idOf(session.customer), subscriptionId });
    if (!subscriptionId) return;
    // customer.subscription.created can come before the session is complete, when its items can't be matched to a
    // business yet (BUG-104), so the businesses are saved again from here.
    const sub = await deps.stripe.retrieveSubscription(subscriptionId);
    await syncSubscription(deps, sub, { ...agency, subscriptionId });
    // A missed invoice.paid left a new account linked but at 0 credits (A1). The first invoice is granted here too,
    // with the same grants and keys as invoicePaid, so the webhook arriving later grants nothing more.
    const invoiceId = idOf(sub.latest_invoice);
    if (!invoiceId) return;
    const first = await deps.stripe.retrieveInvoice(invoiceId);
    if (first.status === "paid") await grantInvoice(deps, first, agency);
    return;
  }
  if (session.mode !== "payment" || session.metadata?.kind !== "topup") return;
  await deps.store.linkStripe(agency.id, { customerId: idOf(session.customer), subscriptionId: null });
  // Delayed payment methods finish later, in checkout.session.async_payment_succeeded.
  if (session.payment_status !== "paid") return;

  const packId = session.metadata?.topup_pack_id ?? "";
  const credits = await deps.store.topupCredits(packId);
  if (!credits) throw new Error(`checkout ${session.id}: unknown top-up pack ${packId}`);
  await deps.store.grant({ agencyId: agency.id, source: "topup", sourceId: session.id, amount: credits, expiresAt: null });
}

function invoiceSubscription(invoice: Stripe.Invoice) {
  const details = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
  return details ? { subscriptionId: idOf(details.subscription), agencyId: details.metadata?.agency_id ?? null } : null;
}

async function invoicePaid(deps: WebhookDeps, invoice: Stripe.Invoice) {
  const sub = invoiceSubscription(invoice);
  if (!sub) return;
  const agency = await requireAgency(deps, { agencyId: sub.agencyId, customerId: idOf(invoice.customer) });
  await grantInvoice(deps, invoice, agency);
}

/** The credits a paid invoice earns. Every grant is keyed by its invoice line, so running it twice grants once. */
async function grantInvoice(deps: WebhookDeps, invoice: Stripe.Invoice, agency: WebhookAgency) {
  const lines = invoice.lines.has_more ? await deps.stripe.listInvoiceLines(invoice.id!) : invoice.lines.data;
  const plans = await deps.store.plansByProduct();
  const periodStarts = await periodStartsFor(deps.stripe, invoiceSubscription(invoice)?.subscriptionId ?? null, invoice.id, lines);

  for (const grant of planInvoiceGrants(invoice, lines, plans, deps.now(), periodStarts)) {
    const { sourceId, amount, expiresAt } = grant;
    if (grant.source === "trial") await deps.store.grantTrial({ agencyId: agency.id, sourceId, amount, expiresAt });
    else await deps.store.grant({ agencyId: agency.id, source: grant.source, sourceId, amount, expiresAt });
  }
  const unknown = lines.filter((l) => l.parent?.type === "subscription_item_details" && !lineProductId(l));
  if (unknown.length) console.warn("[stripe/webhook] invoice lines without a product", invoice.id, unknown.map((l) => l.id));
}

/**
 * Scheduled scans stop at once (enqueue_due_scans skips past_due agencies); the dashboard stays readable. A retried
 * event can arrive after the card was fixed, so it only counts while the invoice is unpaid and Stripe says past due (A7).
 */
async function invoicePaymentFailed(deps: WebhookDeps, invoice: Stripe.Invoice) {
  const sub = invoiceSubscription(invoice);
  if (!sub) return;
  const agency = await requireAgency(deps, { agencyId: sub.agencyId, customerId: idOf(invoice.customer) });
  if (invoice.status === "paid") return;
  if (sub.subscriptionId && isOtherSubscription(agency, sub.subscriptionId)) return;
  const status = sub.subscriptionId ? (await deps.stripe.retrieveSubscription(sub.subscriptionId)).status : "past_due";
  if (status !== "past_due" && status !== "unpaid") return;
  await deps.store.updateAgency(agency.id, { status: "past_due" });
  await deps.store.setBusinessStatus(agency.id, "past_due");

  const to = await deps.store.ownerEmail(agency.ownerUserId);
  if (to) await notify(deps, paymentFailedEmail({ to, agencyId: agency.id, invoice }));
}

async function trialWillEnd(deps: WebhookDeps, sub: Stripe.Subscription) {
  if (sub.status !== "trialing" || !sub.trial_end) return;
  // A cancelled trial is never charged, and the reminder says it will be.
  if (sub.cancel_at_period_end || sub.cancel_at) return;
  const agency = await requireAgency(deps, { agencyId: sub.metadata?.agency_id, customerId: idOf(sub.customer) });
  const to = await deps.store.ownerEmail(agency.ownerUserId);
  if (to) await notify(deps, trialEndingEmail({ to, agencyId: agency.id, subscription: sub }));
}

/** Events can arrive out of order, so the subscription's current state is read from Stripe before it is saved. */
async function subscriptionChanged(deps: WebhookDeps, event: Stripe.Subscription) {
  const agency = await requireAgency(deps, { agencyId: event.metadata?.agency_id, customerId: idOf(event.customer) });
  const current = await deps.stripe.retrieveSubscription(event.id);
  await syncSubscription(deps, current, agency);
}

/** Final state: the subscription ended at period end (cancel) or after the last failed retry. */
async function subscriptionDeleted(deps: WebhookDeps, sub: Stripe.Subscription) {
  const agency = await requireAgency(deps, { agencyId: sub.metadata?.agency_id, customerId: idOf(sub.customer) });
  await syncSubscription(deps, { ...sub, status: "canceled" }, agency);
}

export async function dispatchEvent(deps: WebhookDeps, event: Stripe.Event): Promise<"handled" | "ignored"> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await checkoutCompleted(deps, event.data.object);
      return "handled";
    case "invoice.paid":
      await invoicePaid(deps, event.data.object);
      return "handled";
    case "invoice.payment_failed":
      await invoicePaymentFailed(deps, event.data.object);
      return "handled";
    case "customer.subscription.trial_will_end":
      await trialWillEnd(deps, event.data.object);
      return "handled";
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await subscriptionChanged(deps, event.data.object);
      return "handled";
    case "customer.subscription.deleted":
      await subscriptionDeleted(deps, event.data.object);
      return "handled";
    default:
      return "ignored";
  }
}
