import { Link, Section, Text } from "react-email";
import { EmailLayout } from "./_components/layout";
import { EmailButton, EmailHeading, EmailText } from "./_components/ui";
import { colors, radius } from "./_components/theme";

export type WeeklyBusiness = {
  name: string;
  /** 0 to 100, or null before the first scan finishes. */
  score: number | null;
  /** "AI recommended you in about 6 of 10 customer questions this month." */
  sentence: string | null;
  /** Only changes bigger than the margin of error, e.g. "Up 8 points on last week". */
  change: { direction: "up" | "down"; text: string } | null;
  /** Things to fix found in the last 7 days, most important first. */
  newOpportunities: string[];
  moreOpportunities: number;
  reportUrl: string;
};

export type WeeklyReportEmailProps = {
  businesses: WeeklyBusiness[];
  baseUrl: string;
  unsubscribeUrl?: string | null;
};

// DESIGN.md score bands: 70 to 100 good, 40 to 69 mid, under 40 low.
const scoreColor = (score: number) => (score >= 70 ? colors.goodText : score >= 40 ? colors.midText : colors.lowText);
const small = { fontSize: "13px", lineHeight: "20px", margin: "0 0 8px" };

function BusinessBlock({ business }: { business: WeeklyBusiness }) {
  const { score, change } = business;
  return (
    <Section style={{ border: `1px solid ${colors.border}`, borderRadius: radius, padding: "20px", margin: "0 0 16px" }}>
      <Text style={{ color: colors.text, fontSize: "16px", fontWeight: 600, lineHeight: "24px", margin: "0 0 4px" }}>
        {business.name}
      </Text>
      {score === null ? (
        <Text style={{ ...small, color: colors.textSecondary }}>No score yet. It appears after the first scan finishes.</Text>
      ) : (
        <>
          <Text style={{ color: scoreColor(score), fontSize: "28px", fontWeight: 600, lineHeight: "36px", margin: "0 0 4px" }}>
            {score}
            <span style={{ color: colors.textSecondary, fontSize: "14px", fontWeight: 400 }}> out of 100</span>
          </Text>
          {business.sentence ? <Text style={{ ...small, color: colors.text }}>{business.sentence}</Text> : null}
          <Text style={{ ...small, color: change ? colors.text : colors.textSecondary, fontWeight: change ? 600 : 400 }}>
            {change ? change.text : "No real change on last week."}
          </Text>
        </>
      )}
      {business.newOpportunities.length > 0 ? (
        <>
          <Text style={{ ...small, color: colors.text, fontWeight: 600, margin: "12px 0 4px" }}>New things to fix</Text>
          {business.newOpportunities.map((title) => (
            <Text key={title} style={{ ...small, color: colors.text, margin: "0 0 4px", paddingLeft: "12px" }}>
              {"• "}
              {title}
            </Text>
          ))}
          {business.moreOpportunities > 0 ? (
            <Text style={{ ...small, color: colors.textSecondary, margin: "0 0 4px", paddingLeft: "12px" }}>
              and {business.moreOpportunities} more
            </Text>
          ) : null}
        </>
      ) : null}
      <Text style={{ ...small, margin: "12px 0 0" }}>
        <Link href={business.reportUrl} style={{ color: colors.primary, fontWeight: 600, textDecoration: "underline" }}>
          See the full report
        </Link>
      </Text>
    </Section>
  );
}

export function weeklyReportPreview(businesses: WeeklyBusiness[]): string {
  const changed = businesses.filter((b) => b.change).length;
  if (changed === 0) return "No big moves this week. Here's where each business stands.";
  return `${changed} ${changed === 1 ? "business" : "businesses"} moved this week`;
}

export default function WeeklyReportEmail({ businesses, baseUrl, unsubscribeUrl }: WeeklyReportEmailProps) {
  const base = baseUrl.replace(/\/$/, "");
  const one = businesses.length === 1;
  return (
    <EmailLayout preview={weeklyReportPreview(businesses)} baseUrl={baseUrl} unsubscribeUrl={unsubscribeUrl}>
      <EmailHeading>{one ? `How ${businesses[0].name} did this week` : "How your businesses did this week"}</EmailHeading>
      <EmailText>
        Each score is how often ChatGPT, Claude and Perplexity recommended the business over the last 30 days. We only
        mention a change when it&apos;s bigger than the margin of error.
      </EmailText>
      {businesses.map((business) => (
        <BusinessBlock key={business.reportUrl} business={business} />
      ))}
      <Section style={{ paddingTop: "8px" }}>
        <EmailButton href={`${base}/dashboard`}>Open your dashboard</EmailButton>
      </Section>
    </EmailLayout>
  );
}

WeeklyReportEmail.PreviewProps = {
  businesses: [
    {
      name: "Bean There Coffee",
      score: 64,
      sentence: "AI recommended you in about 6 of 10 customer questions this month.",
      change: { direction: "up", text: "Up 8 points on last week" },
      newOpportunities: ["Add your opening hours to Google", "Get listed on Yelp"],
      moreOpportunities: 1,
      reportUrl: "https://customers.direct/r/preview-one",
    },
    {
      name: "Joe's Plumbing",
      score: 31,
      sentence: "AI recommended you in about 3 of 10 customer questions this month.",
      change: null,
      newOpportunities: [],
      moreOpportunities: 0,
      reportUrl: "https://customers.direct/r/preview-two",
    },
  ],
  baseUrl: "https://customers.direct",
  unsubscribeUrl: "https://customers.direct/email/unsubscribe?token=preview",
} satisfies WeeklyReportEmailProps;
