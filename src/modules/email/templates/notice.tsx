import { Section } from "react-email";
import { EmailLayout } from "./_components/layout";
import { EmailButton, EmailHeading, EmailText } from "./_components/ui";

// A plain message with an optional button. The B-62 emails build on the same layout and parts.
export type NoticeEmailProps = {
  preview: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
  baseUrl: string;
  unsubscribeUrl?: string | null;
};

export default function NoticeEmail({ preview, heading, paragraphs, action, baseUrl, unsubscribeUrl }: NoticeEmailProps) {
  return (
    <EmailLayout preview={preview} baseUrl={baseUrl} unsubscribeUrl={unsubscribeUrl}>
      <EmailHeading>{heading}</EmailHeading>
      {paragraphs.map((text) => (
        <EmailText key={text}>{text}</EmailText>
      ))}
      {action ? (
        <Section style={{ paddingTop: "8px" }}>
          <EmailButton href={action.href}>{action.label}</EmailButton>
        </Section>
      ) : null}
    </EmailLayout>
  );
}

NoticeEmail.PreviewProps = {
  preview: "Your first AI visibility check is ready",
  heading: "Your first check is ready",
  paragraphs: [
    "We asked ChatGPT, Claude and Perplexity the questions your customers ask. See where you were recommended and what to fix first.",
  ],
  action: { label: "See your results", href: "https://customers.direct/dashboard" },
  baseUrl: "https://customers.direct",
  unsubscribeUrl: "https://customers.direct/email/unsubscribe?token=preview",
} satisfies NoticeEmailProps;
