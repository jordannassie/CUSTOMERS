import { utcDate } from "@/lib/time-zone";
import type Stripe from "stripe";
import { PaymentFailedEmail, sendEmail, TrialEndingEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";
import { formatUsd } from "../format";
import { firstChargeCents } from "../plan-change/trial-bill";

// The two billing emails the webhook sends (MVP_SPEC 10, B-62).

export type SendBillingEmail = (input: SendEmailInput) => Promise<SendEmailResult>;

export const sendBillingEmail: SendBillingEmail = (input) => sendEmail(input);

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

export function trialEndingEmail(input: {
  to: string;
  agencyId: string;
  subscription: Stripe.Subscription;
  /** The subscription's schedule, when it has one: a pending change sets the first charge. */
  schedule?: Stripe.SubscriptionSchedule | null;
}): SendEmailInput {
  const sub = input.subscription;
  const trialEnd = new Date(sub.trial_end! * 1000);
  // The reader's zone is unknown in an email, so the date is UTC and says so (BUG-070).
  const date = utcDate(trialEnd);
  // A business coming off at the trial end is not in the first charge (BUG-245, the same rule as the Billing dialog).
  const cents = firstChargeCents(sub, input.schedule ?? null);
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
