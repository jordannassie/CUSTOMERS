import { Section } from "react-email";
import { EmailLayout } from "./_components/layout";
import { EmailButton, EmailHeading, EmailText } from "./_components/ui";

export type TrialEndingEmailProps = {
  /** "October 2" */
  date: string;
  /** "$298", or null when the subscription's price could not be worked out. */
  amount: string | null;
  baseUrl: string;
};

export default function TrialEndingEmail({ date, amount, baseUrl }: TrialEndingEmailProps) {
  const base = baseUrl.replace(/\/$/, "");
  return (
    <EmailLayout preview={amount ? `We'll charge ${amount} on ${date}` : `Your plan starts on ${date}`} baseUrl={baseUrl}>
      <EmailHeading>Your free trial ends on {date}</EmailHeading>
      <EmailText>
        {amount
          ? `On ${date} we'll charge ${amount} to your card for the first month of your plan, and add your monthly credits.`
          : `On ${date} we'll charge your card for the first month of your plan, and add your monthly credits.`}
      </EmailText>
      <EmailText>
        Nothing to do if you want to keep going. To change your plan or cancel before then, go to Billing.
      </EmailText>
      <Section style={{ paddingTop: "8px" }}>
        <EmailButton href={`${base}/settings/billing`}>Go to billing</EmailButton>
      </Section>
    </EmailLayout>
  );
}

TrialEndingEmail.PreviewProps = {
  date: "October 2",
  amount: "$298",
  baseUrl: "https://customers.direct",
} satisfies TrialEndingEmailProps;
