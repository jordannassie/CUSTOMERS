import {
  LOW_CREDITS_COPY,
  LowCreditsEmail,
  WeeklyReportEmail,
  WelcomeEmail,
  type EmailLinks,
  type SendEmailInput,
} from "@/modules/email";
import { emailSnapshot, reportEmailText } from "@/modules/reports";
import { lowCreditsKey, renewalDate, weeklyReportKey, weeklyReportSubject, welcomeKey, type LowCreditAgency, type ReportedBusiness } from "./service";

// The three emails this module sends (MVP_SPEC 10). Billing sends trial ending and payment failed from its webhook.

export function welcomeEmail(input: { to: string; agencyId: string }): SendEmailInput {
  return {
    type: "welcome",
    to: input.to,
    subject: "Welcome to Customers.Direct",
    agencyId: input.agencyId,
    idempotencyKey: welcomeKey(input.agencyId),
    template: ({ baseUrl }) => <WelcomeEmail baseUrl={baseUrl} />,
  };
}

export function lowCreditsEmail(input: { to: string; agency: LowCreditAgency; now: Date }): SendEmailInput {
  const { agency } = input;
  return {
    type: "low_credits",
    to: input.to,
    subject: LOW_CREDITS_COPY[agency.level].subject,
    agencyId: agency.agencyId,
    idempotencyKey: lowCreditsKey(agency, input.now),
    template: ({ baseUrl }) => (
      <LowCreditsEmail
        level={agency.level}
        used={agency.used}
        total={agency.total}
        balance={agency.balance}
        renewsOn={renewalDate(agency.periodEnd)}
        baseUrl={baseUrl}
      />
    ),
  };
}

/**
 * The weekly email's plain text (D-90): each business's report summary with its PDF link, the same numbers as the
 * PDF, then the dashboard and unsubscribe links.
 */
export function weeklyReportText(businesses: ReportedBusiness[], { baseUrl, unsubscribeUrl }: EmailLinks): string {
  const base = baseUrl.replace(/\/$/, "");
  const blocks = businesses.map((b) =>
    b.snapshot
      ? reportEmailText(emailSnapshot(b.snapshot), b.pdf ? `${base}${b.reportUrl}` : null)
      : `${b.name}\nNo score yet. It appears after the first scan finishes.`,
  );
  const footer = [`Open your dashboard: ${base}/dashboard`];
  if (unsubscribeUrl) footer.push(`Unsubscribe from weekly reports: ${unsubscribeUrl}`);
  return [...blocks, footer.join("\n")].join("\n\n");
}

export function weeklyReportEmail(input: {
  to: string;
  agencyId: string;
  businesses: ReportedBusiness[];
  now: Date;
}): SendEmailInput {
  return {
    type: "weekly_report",
    to: input.to,
    subject: weeklyReportSubject(input.businesses),
    agencyId: input.agencyId,
    idempotencyKey: weeklyReportKey(input.agencyId, input.now),
    template: ({ baseUrl, unsubscribeUrl }) => {
      // Businesses carry the share link path; the email needs the full address.
      const base = baseUrl.replace(/\/$/, "");
      const businesses = input.businesses.map((b) => ({ ...b, reportUrl: `${base}${b.reportUrl}` }));
      return <WeeklyReportEmail businesses={businesses} baseUrl={baseUrl} unsubscribeUrl={unsubscribeUrl} />;
    },
    text: (links) => weeklyReportText(input.businesses, links),
  };
}
