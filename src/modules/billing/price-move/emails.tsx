import { utcDate } from "@/lib/time-zone";
import { NoticeEmail, type SendEmailInput } from "@/modules/email";
import { formatUsd } from "../format";
import type { PriceNotice } from "./dal";

// The email that tells an agency its plan price changes at its next renewal (D-93), sent once per batch of moves.

export const priceChangeKey = (batch: string) => `price_change:${batch}`;

/** The email's sentences, also its plain text part. */
export function priceChangeParagraphs(notice: PriceNotice): string[] {
  // The reader's zone is unknown in an email, so the date is UTC and says so (BUG-070).
  const date = utcDate(new Date(notice.startsAt), { month: "long", day: "numeric", year: "numeric" });
  const lead = notice.trialing
    ? `When your free trial ends on ${date}, your plan is billed at our new prices.`
    : `From your next renewal on ${date}, your plan is billed at our new prices.`;
  const lines = notice.lines.map(
    (l) => `${l.business} (${l.plan}): ${formatUsd(l.toCents)} a month from ${date}, instead of ${formatUsd(l.fromCents)} a month.`,
  );
  const close = `Nothing changes before then. You can change or cancel your plan in Billing at any time before ${date}.`;
  return [lead, ...lines, close];
}

export function priceChangeEmail(input: { to: string; notice: PriceNotice }): SendEmailInput {
  const { notice } = input;
  const down = notice.lines.every((l) => l.toCents < l.fromCents);
  const subject = down ? "Your Customers.Direct price is going down" : "Your Customers.Direct price is changing";
  const paragraphs = priceChangeParagraphs(notice);
  return {
    type: "price_change",
    to: input.to,
    subject,
    agencyId: notice.agencyId,
    idempotencyKey: priceChangeKey(notice.batch),
    template: ({ baseUrl }) => (
      <NoticeEmail
        preview={paragraphs[0]}
        heading={subject}
        paragraphs={paragraphs}
        action={{ label: "Open Billing", href: `${baseUrl.replace(/\/$/, "")}/settings/billing` }}
        baseUrl={baseUrl}
      />
    ),
    text: ({ baseUrl }) => [...paragraphs, `Open Billing: ${baseUrl.replace(/\/$/, "")}/settings/billing`].join("\n\n"),
  };
}
