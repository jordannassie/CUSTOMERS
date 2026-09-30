import { NoticeEmail, type SendEmailInput } from "@/modules/email";
import { accountDeletedKey, accountPurgedKey, accountRestoredKey, businessDeletedKey, longDate } from "./service";

// One email at each step of a deletion (MVP_SPEC 23). Plain notices: nothing here is marketing.

const support = (baseUrl: string) => ({ label: "Contact us", href: `${baseUrl.replace(/\/$/, "")}/contact?topic=support` });

export function businessDeletedEmail(input: {
  to: string;
  agencyId: string;
  businessId: string;
  businessName: string;
  planEndsAt: string | null;
  purgeAt: Date;
}): SendEmailInput {
  const billing = input.planEndsAt
    ? `Its plan ends on ${longDate(input.planEndsAt)}. You won't be charged for it after that, and there is no refund for the time left.`
    : "It wasn't on a paid plan, so your bill doesn't change.";
  return {
    type: "business_deleted",
    to: input.to,
    subject: `${input.businessName} was deleted`,
    agencyId: input.agencyId,
    idempotencyKey: businessDeletedKey(input.businessId),
    template: ({ baseUrl }) => (
      <NoticeEmail
        preview={`${input.businessName} is gone from your account`}
        heading={`${input.businessName} was deleted`}
        paragraphs={[
          `We stopped its AI checks and turned off its share links. ${billing}`,
          `Its questions, results and reports will be removed for good on ${longDate(input.purgeAt)}. If you didn't mean to delete it, contact us before then.`,
        ]}
        action={support(baseUrl)}
        baseUrl={baseUrl}
      />
    ),
  };
}

export function accountDeletedEmail(input: { to: string; agencyId: string; agencyName: string; purgeAt: Date }): SendEmailInput {
  return {
    type: "account_deleted",
    to: input.to,
    subject: "Your Customers.Direct account was deleted",
    agencyId: input.agencyId,
    idempotencyKey: accountDeletedKey(input.agencyId),
    template: ({ baseUrl }) => (
      <NoticeEmail
        preview="Your account is closed and your plan is canceled"
        heading="Your account was deleted"
        paragraphs={[
          `We deleted the ${input.agencyName} account. Your plan is canceled and you won't be charged again. AI checks have stopped and share links no longer work.`,
          `We keep your data until ${longDate(input.purgeAt)} in case this was a mistake. After that it is removed for good. Your past invoices stay with Stripe, our payment provider.`,
          "Changed your mind? Contact us before that date and we can bring the account back.",
        ]}
        action={support(baseUrl)}
        baseUrl={baseUrl}
      />
    ),
  };
}

export function accountRestoredEmail(input: { to: string; agencyId: string; at: Date }): SendEmailInput {
  return {
    type: "account_restored",
    to: input.to,
    subject: "Your Customers.Direct account is back",
    agencyId: input.agencyId,
    idempotencyKey: accountRestoredKey(input.agencyId, input.at),
    template: ({ baseUrl }) => (
      <NoticeEmail
        preview="You can log in again"
        heading="Your account is back"
        paragraphs={[
          "We restored your account, so you can log in again. Your businesses, questions and results are where you left them.",
          "Deleting the account canceled your plan, so choose a plan to start AI checks again. Share links from before stay off; make new ones from each business.",
        ]}
        action={{ label: "Log in", href: `${baseUrl.replace(/\/$/, "")}/login` }}
        baseUrl={baseUrl}
      />
    ),
  };
}

export function accountPurgedEmail(input: { to: string; agencyId: string; agencyName: string }): SendEmailInput {
  return {
    type: "account_purged",
    to: input.to,
    subject: "Your Customers.Direct data has been removed",
    // The agency row is gone, so the log entry has no agency to point at.
    agencyId: null,
    idempotencyKey: accountPurgedKey(input.agencyId),
    template: ({ baseUrl }) => (
      <NoticeEmail
        preview="This is the last email from us about your account"
        heading="Your data has been removed"
        paragraphs={[
          `As promised when you deleted the ${input.agencyName} account, we have now removed its businesses, questions, results, logo and your login for good.`,
          "We keep a record of past credit use with no link to you, and your invoices stay with Stripe for tax records. This is the last email we send about this account.",
        ]}
        baseUrl={baseUrl}
      />
    ),
  };
}
