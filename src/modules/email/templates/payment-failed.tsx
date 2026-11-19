import { Section } from "react-email";
import { EmailLayout } from "./_components/layout";
import { EmailButton, EmailHeading, EmailText } from "./_components/ui";

export type PaymentFailedEmailProps = {
  /** "$298", or null when the invoice had no amount due. */
  amount: string | null;
  baseUrl: string;
};

export default function PaymentFailedEmail({ amount, baseUrl }: PaymentFailedEmailProps) {
  const base = baseUrl.replace(/\/$/, "");
  return (
    <EmailLayout preview="Update your card to start your scans again" baseUrl={baseUrl}>
      <EmailHeading>Your payment didn&apos;t go through</EmailHeading>
      <EmailText>
        {amount
          ? `We couldn't charge your card ${amount} for Customers.Direct, so your scheduled scans are paused.`
          : "We couldn't charge your card for Customers.Direct, so your scheduled scans are paused."}
      </EmailText>
      <EmailText>
        Your dashboard and past results are all still there. Update your card and we&apos;ll try the payment again.
        Your scans start again as soon as it goes through.
      </EmailText>
      <Section style={{ paddingTop: "8px" }}>
        <EmailButton href={`${base}/settings/billing`}>Update your card</EmailButton>
      </Section>
    </EmailLayout>
  );
}

PaymentFailedEmail.PreviewProps = { amount: "$298", baseUrl: "https://customers.direct" } satisfies PaymentFailedEmailProps;
