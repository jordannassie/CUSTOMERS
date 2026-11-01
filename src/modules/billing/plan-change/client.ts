import type Stripe from "stripe";

// The Stripe calls plan changes make. The actions pass the real client; tests pass a fake, so no test calls Stripe.

export type PlanChangeStripe = {
  retrieveSubscription(id: string): Promise<Stripe.Subscription>;
  retrieveSchedule(id: string): Promise<Stripe.SubscriptionSchedule>;
  createScheduleFromSubscription(subscriptionId: string, idempotencyKey: string): Promise<Stripe.SubscriptionSchedule>;
  updateSchedule(
    id: string,
    params: Stripe.SubscriptionScheduleUpdateParams,
    idempotencyKey: string,
  ): Promise<Stripe.SubscriptionSchedule>;
  releaseSchedule(id: string, idempotencyKey: string): Promise<Stripe.SubscriptionSchedule>;
  updateSubscription(
    id: string,
    params: Stripe.SubscriptionUpdateParams,
    idempotencyKey: string,
  ): Promise<Stripe.Subscription>;
  previewInvoice(params: Stripe.InvoiceCreatePreviewParams): Promise<Stripe.Invoice>;
  // Only needed once a charge made now is left pending (payment.ts). The live client has them; the billing fixtures
  // never leave a charge pending, so they may leave them out.
  /** The payment behind a pending update's invoice, to tell a bank confirmation (3D Secure) from a decline. */
  retrievePaymentIntent?(id: string): Promise<Stripe.PaymentIntent>;
  retrieveInvoice?(id: string): Promise<Stripe.Invoice>;
  /** Voiding a pending update's open invoice drops the update: nothing changes and nothing is charged. */
  voidInvoice?(id: string, idempotencyKey: string): Promise<Stripe.Invoice>;
};

export function stripePlanChangeClient(stripe: Stripe): PlanChangeStripe {
  return {
    retrieveSubscription: (id) => stripe.subscriptions.retrieve(id),
    // Prices expanded, so the billing page can tell a pending plan by its product (BUG-103).
    retrieveSchedule: (id) => stripe.subscriptionSchedules.retrieve(id, { expand: ["phases.items.price"] }),
    createScheduleFromSubscription: (subscriptionId, idempotencyKey) =>
      stripe.subscriptionSchedules.create({ from_subscription: subscriptionId }, { idempotencyKey }),
    updateSchedule: (id, params, idempotencyKey) => stripe.subscriptionSchedules.update(id, params, { idempotencyKey }),
    releaseSchedule: (id, idempotencyKey) => stripe.subscriptionSchedules.release(id, {}, { idempotencyKey }),
    updateSubscription: (id, params, idempotencyKey) => stripe.subscriptions.update(id, params, { idempotencyKey }),
    previewInvoice: (params) => stripe.invoices.createPreview(params),
    retrievePaymentIntent: (id) => stripe.paymentIntents.retrieve(id),
    retrieveInvoice: (id) => stripe.invoices.retrieve(id),
    voidInvoice: (id, idempotencyKey) => stripe.invoices.voidInvoice(id, {}, { idempotencyKey }),
  };
}
