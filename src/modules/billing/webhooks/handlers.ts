import type Stripe from "stripe";
import { lineProductId, planInvoiceGrants } from "./credits";
import type { AgencyStatus, BusinessItem, WebhookAgency, WebhookStore } from "./dal";
import { paymentFailedEmail, trialEndingEmail, type SendBillingEmail } from "./emails";

// One handler per Stripe event (MVP_SPEC 11.3, 11.5, D-39, D-57). Everything outside comes in through deps,
// so fixture tests run them with no Stripe calls and no real email sends.

/** Stripe reads for the rare cases a payload is not enough. The route passes the real client; tests pass fakes. */
export type StripeReader = {
  retrieveSubscription(id: string): Promise<Stripe.Subscription>;
  listSubscriptionItems(subscriptionId: string): Promise<Stripe.SubscriptionItem[]>;
  listInvoiceLines(invoiceId: string): Promise<Stripe.InvoiceLineItem[]>;
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

async function requireAgency(deps: WebhookDeps, ref: { agencyId?: string | null; customerId?: string | null }) {
  const agency = await deps.store.findAgency(ref);
  // Thrown so Stripe retries: checkout.session.completed may not have linked the customer yet.
  if (!agency) throw new Error(`no agency for ${ref.agencyId ?? ref.customerId ?? "event"}`);
  return agency;
}

async function syncSubscription(deps: WebhookDeps, sub: Stripe.Subscription, agency: WebhookAgency) {
  const items = sub.items.has_more ? await deps.stripe.listSubscriptionItems(sub.id) : sub.items.data;
  const plans = await deps.store.plansByProduct();
  const status = agencyStatusFor(sub.status);
  const periodEnds = items.map((i) => i.current_period_end).filter(Boolean);

  await deps.store.linkStripe(agency.id, { customerId: idOf(sub.customer), subscriptionId: sub.id });
  await deps.store.updateAgency(agency.id, {
    status: status ?? undefined,
    trialEndsAt: iso(sub.trial_end),
    currentPeriodEnd: periodEnds.length ? iso(Math.max(...periodEnds)) : null,
  });
  if (!status) return;
  // A whole-account cancel keeps each business's schedule, so scans resume if the agency subscribes again.
  if (status === "canceled") return deps.store.setBusinessStatus(agency.id, "canceled");

  const businessItems: BusinessItem[] = [];
  for (const item of items) {
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
    await deps.store.linkStripe(agency.id, { customerId: idOf(session.customer), subscriptionId: idOf(session.subscription) });
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
  const lines = invoice.lines.has_more ? await deps.stripe.listInvoiceLines(invoice.id!) : invoice.lines.data;
  const plans = await deps.store.plansByProduct();

  for (const grant of planInvoiceGrants(invoice, lines, plans, deps.now())) {
    await deps.store.grant({ agencyId: agency.id, source: grant.source, sourceId: grant.sourceId, amount: grant.amount, expiresAt: grant.expiresAt });
  }
  const unknown = lines.filter((l) => l.parent?.type === "subscription_item_details" && !lineProductId(l));
  if (unknown.length) console.warn("[stripe/webhook] invoice lines without a product", invoice.id, unknown.map((l) => l.id));
}

/** Scheduled scans stop at once (enqueue_due_scans skips past_due agencies); the dashboard stays readable. */
async function invoicePaymentFailed(deps: WebhookDeps, invoice: Stripe.Invoice) {
  const sub = invoiceSubscription(invoice);
  if (!sub) return;
  const agency = await requireAgency(deps, { agencyId: sub.agencyId, customerId: idOf(invoice.customer) });
  await deps.store.updateAgency(agency.id, { status: "past_due" });
  await deps.store.setBusinessStatus(agency.id, "past_due");

  const to = await deps.store.ownerEmail(agency.ownerUserId);
  if (to) await deps.sendEmail(paymentFailedEmail({ to, agencyId: agency.id, invoiceId: invoice.id! }));
}

async function trialWillEnd(deps: WebhookDeps, sub: Stripe.Subscription) {
  if (sub.status !== "trialing" || !sub.trial_end) return;
  const agency = await requireAgency(deps, { agencyId: sub.metadata?.agency_id, customerId: idOf(sub.customer) });
  const to = await deps.store.ownerEmail(agency.ownerUserId);
  if (to) {
    await deps.sendEmail(
      trialEndingEmail({ to, agencyId: agency.id, subscriptionId: sub.id, trialEnd: new Date(sub.trial_end * 1000) }),
    );
  }
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
