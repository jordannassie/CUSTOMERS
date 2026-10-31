import { Section } from "react-email";
import { EmailLayout } from "./_components/layout";
import { EmailButton, EmailHeading, EmailText } from "./_components/ui";

export type LowCreditsLevel = "low" | "empty" | "negative";

export type LowCreditsEmailProps = {
  level: LowCreditsLevel;
  /** Plan and trial credits used this period, and how many the period had. */
  used: number;
  total: number;
  /** Credits left, top-ups included. Below zero after a running scan finished past the end of the balance. */
  balance: number;
  /** "October 2", when the plan renews and new credits arrive. */
  renewsOn: string | null;
  baseUrl: string;
};

const count = (n: number) => new Intl.NumberFormat("en-US").format(n);

export const LOW_CREDITS_COPY: Record<LowCreditsLevel, { subject: string; preview: string }> = {
  low: { subject: "You've used 80% of your credits", preview: "Your scans keep running, but credits are getting low" },
  empty: { subject: "You're out of credits", preview: "New scans are on hold until you add credits" },
  negative: { subject: "Your credit balance is below zero", preview: "New scans are on hold until you add credits" },
};

function Body({ level, used, total, balance, renewsOn }: Omit<LowCreditsEmailProps, "baseUrl">) {
  const renewal = renewsOn ? ` Your plan adds new credits on ${renewsOn}.` : "";
  if (level === "low") {
    return (
      <>
        <EmailText>
          You&apos;ve used {count(used)} of your {count(total)} credits for this period. Your scheduled scans keep running
          until the credits run out.{renewal}
        </EmailText>
        <EmailText>If you think you&apos;ll need more before then, you can buy a credit pack. Top-up credits never expire.</EmailText>
      </>
    );
  }
  if (level === "empty") {
    return (
      <>
        <EmailText>You&apos;ve used all your credits, so new scans won&apos;t start until you add more.{renewal}</EmailText>
        <EmailText>Your dashboard and past results are all still there. Buy a credit pack to start scanning again today.</EmailText>
      </>
    );
  }
  return (
    <>
      <EmailText>
        A scan that was already running finished after your credits ran out, so your balance is now {count(balance)}. We
        never stop a scan halfway through.
      </EmailText>
      <EmailText>
        New scans won&apos;t start until your balance is above zero. The next credits you get pay this back first.{renewal}
      </EmailText>
    </>
  );
}

export default function LowCreditsEmail({ baseUrl, ...props }: LowCreditsEmailProps) {
  const base = baseUrl.replace(/\/$/, "");
  return (
    <EmailLayout preview={LOW_CREDITS_COPY[props.level].preview} baseUrl={baseUrl}>
      <EmailHeading>{LOW_CREDITS_COPY[props.level].subject}</EmailHeading>
      <Body {...props} />
      <Section style={{ paddingTop: "8px" }}>
        <EmailButton href={`${base}/settings/credits`}>Buy credits</EmailButton>
      </Section>
    </EmailLayout>
  );
}

LowCreditsEmail.PreviewProps = {
  level: "low",
  used: 960,
  total: 1200,
  balance: 240,
  renewsOn: "October 2",
  baseUrl: "https://customers.direct",
} satisfies LowCreditsEmailProps;
