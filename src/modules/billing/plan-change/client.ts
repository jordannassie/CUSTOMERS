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
};

export function stripePlanChangeClient(stripe: Stripe): PlanChangeStripe {
  return {
    retrieveSubscription: (id) => stripe.subscriptions.retrieve(id),
    retrieveSchedule: (id) => stripe.subscriptionSchedules.retrieve(id),
    createScheduleFromSubscription: (subscriptionId, idempotencyKey) =>
      stripe.subscriptionSchedules.create({ from_subscription: subscriptionId }, { idempotencyKey }),
    updateSchedule: (id, params, idempotencyKey) => stripe.subscriptionSchedules.update(id, params, { idempotencyKey }),
    releaseSchedule: (id, idempotencyKey) => stripe.subscriptionSchedules.release(id, {}, { idempotencyKey }),
    updateSubscription: (id, params, idempotencyKey) => stripe.subscriptions.update(id, params, { idempotencyKey }),
    previewInvoice: (params) => stripe.invoices.createPreview(params),
  };
}
