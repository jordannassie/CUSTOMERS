import type Stripe from "stripe";
import { PaymentFailedEmail, sendEmail, TrialEndingEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";
import { formatUsd } from "../format";

// The two billing emails the webhook sends (MVP_SPEC 10, B-62).

export type SendBillingEmail = (input: SendEmailInput) => Promise<SendEmailResult>;

export const sendBillingEmail: SendBillingEmail = (input) => sendEmail(input);

const DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

/** What the first charge after the trial will be: every item's price times its quantity. Null when a price is unknown. */
export function trialChargeCents(sub: Stripe.Subscription): number | null {
  let total = 0;
  for (const item of sub.items.data) {
    const { unit_amount: unit, currency } = item.price;
    if (unit === null || unit === undefined || (currency && currency !== "usd")) return null;
    total += unit * (item.quantity ?? 1);
  }
  return sub.items.data.length > 0 ? total : null;
}

export function paymentFailedEmail(input: { to: string; agencyId: string; invoice: Stripe.Invoice }): SendEmailInput {
  const { amount_due: due, currency } = input.invoice;
  const amount = due > 0 && currency === "usd" ? formatUsd(due) : null;
  return {
    type: "payment_failed",
    to: input.to,
    subject: "Your payment didn't go through",
    agencyId: input.agencyId,
    // Stripe retries a failed invoice several times; one email per invoice is enough.
    idempotencyKey: `payment_failed:${input.invoice.id}`,
    template: ({ baseUrl }) => <PaymentFailedEmail amount={amount} baseUrl={baseUrl} />,
  };
}

export function trialEndingEmail(input: { to: string; agencyId: string; subscription: Stripe.Subscription }): SendEmailInput {
  const sub = input.subscription;
  const trialEnd = new Date(sub.trial_end! * 1000);
  const date = DATE.format(trialEnd);
  const cents = trialChargeCents(sub);
  return {
    type: "trial_ending",
    to: input.to,
    subject: `Your free trial ends on ${date}`,
    agencyId: input.agencyId,
    // Keyed on the trial end too, so a trial extended to a new date gets its own reminder.
    idempotencyKey: `trial_ending:${sub.id}:${trialEnd.getTime()}`,
    template: ({ baseUrl }) => <TrialEndingEmail date={date} amount={cents === null ? null : formatUsd(cents)} baseUrl={baseUrl} />,
  };
}
