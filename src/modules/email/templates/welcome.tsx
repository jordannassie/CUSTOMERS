import { Section } from "react-email";
import { EmailLayout } from "./_components/layout";
import { EmailButton, EmailHeading, EmailText } from "./_components/ui";

export type WelcomeEmailProps = { baseUrl: string };

export default function WelcomeEmail({ baseUrl }: WelcomeEmailProps) {
  const base = baseUrl.replace(/\/$/, "");
  return (
    <EmailLayout preview="Here's what happens next" baseUrl={baseUrl}>
      <EmailHeading>Welcome to Customers.Direct</EmailHeading>
      <EmailText>Thanks for signing up. Here&apos;s what happens next.</EmailText>
      <EmailText>
        Add a business and we ask ChatGPT, Claude and Perplexity the questions its customers ask. You see how often
        it gets recommended, which competitors come up instead, and what to fix first.
      </EmailText>
      <EmailText>
        Your score gets more accurate with every scan, and we send you a short summary every Monday so you can see what
        changed.
      </EmailText>
      <Section style={{ paddingTop: "8px" }}>
        <EmailButton href={`${base}/dashboard`}>Go to your dashboard</EmailButton>
      </Section>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = { baseUrl: "https://customers.direct" } satisfies WelcomeEmailProps;
