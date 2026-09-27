import { NoticeEmail, sendEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";

// The two billing emails the webhook sends (MVP_SPEC 10). B-62 replaces these plain notices with the final templates.

export type SendBillingEmail = (input: SendEmailInput) => Promise<SendEmailResult>;

export const sendBillingEmail: SendBillingEmail = (input) => sendEmail(input);

const DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

export function paymentFailedEmail(input: { to: string; agencyId: string; invoiceId: string }): SendEmailInput {
  return {
    type: "payment_failed",
    to: input.to,
    subject: "Your payment didn't go through",
    agencyId: input.agencyId,
    // Stripe retries a failed invoice several times; one email per invoice is enough.
    idempotencyKey: `payment_failed:${input.invoiceId}`,
    template: ({ baseUrl }) => (
      <NoticeEmail
        preview="Update your card to keep your automatic scans running"
        heading="Your payment didn't go through"
        paragraphs={[
          "We couldn't charge your card for Customers.Direct. Your automatic scans are paused until the payment goes through.",
          "Your dashboard and past results are still there. Update your card and we'll try the payment again.",
        ]}
        action={{ label: "Update payment details", href: `${baseUrl}/dashboard/billing` }}
        baseUrl={baseUrl}
      />
    ),
  };
}

export function trialEndingEmail(input: {
  to: string;
  agencyId: string;
  subscriptionId: string;
  trialEnd: Date;
}): SendEmailInput {
  const date = DATE.format(input.trialEnd);
  return {
    type: "trial_ending",
    to: input.to,
    subject: `Your free trial ends on ${date}`,
    agencyId: input.agencyId,
    idempotencyKey: `trial_ending:${input.subscriptionId}:${input.trialEnd.getTime()}`,
    template: ({ baseUrl }) => (
      <NoticeEmail
        preview={`Your plan starts on ${date}`}
        heading={`Your free trial ends on ${date}`}
        paragraphs={[
          `On ${date} we'll charge your card for your plan and add your monthly credits.`,
          "Nothing to do if you want to keep going. To change your plan or cancel before then, go to Billing.",
        ]}
        action={{ label: "Go to billing", href: `${baseUrl}/dashboard/billing` }}
        baseUrl={baseUrl}
      />
    ),
  };
}
