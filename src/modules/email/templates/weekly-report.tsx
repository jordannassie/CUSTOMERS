import { Link, Section, Text } from "react-email";
import { EmailLayout } from "./_components/layout";
import { EmailButton, EmailHeading, EmailText } from "./_components/ui";
import { colors, radius } from "./_components/theme";

export type WeeklyBusiness = {
  name: string;
  /** 0 to 100, or null before the first scan finishes. From the business's current report (D-90). */
  score: number | null;
  /** "9 of 60 answers named you." */
  named?: { answers: number; total: number } | null;
  /** Its place among the tracked businesses by score; null when AI named none of them. */
  rank?: { position: number; of: number } | null;
  /** The report's headline: "AI named Bean There Coffee in 9 of 60 answers. Bean House was named in 23." */
  sentence: string | null;
  /** Why competitors are ahead, from the report; null when there is none. */
  reason?: string | null;
  /** Only changes bigger than the margin of error, e.g. "Up 8 points on the 30 days before". */
  change: { direction: "up" | "down"; text: string } | null;
  /** The report's top fixes, most important first, with where each is made. */
  fixes: { title: string; where: string }[];
  moreFixes: number;
  reportUrl: string;
  /** True when reportUrl opens the report PDF (a share link); false when it is the dashboard. */
  pdf?: boolean;
  /** The AI tools chosen for the business, by name ("ChatGPT", "Claude"); all three when left out. */
  aiTools?: string[];
};

export type WeeklyReportEmailProps = {
  businesses: WeeklyBusiness[];
  baseUrl: string;
  unsubscribeUrl?: string | null;
};

// DESIGN.md score bands: 70 to 100 good, 40 to 69 mid, under 40 low.
const scoreColor = (score: number) => (score >= 70 ? colors.goodText : score >= 40 ? colors.midText : colors.lowText);
const small = { fontSize: "13px", lineHeight: "20px", margin: "0 0 8px" };

function BusinessBlock({ business, showTools }: { business: WeeklyBusiness; showTools: boolean }) {
  const { score, change } = business;
  return (
    <Section style={{ border: `1px solid ${colors.border}`, borderRadius: radius, padding: "20px", margin: "0 0 16px" }}>
      <Text style={{ color: colors.text, fontSize: "16px", fontWeight: 600, lineHeight: "24px", margin: "0 0 4px" }}>
        {business.name}
      </Text>
      {showTools ? <Text style={{ ...small, color: colors.textSecondary }}>Checked on {joinTools(toolsOf(business))}.</Text> : null}
      {score === null ? (
        <Text style={{ ...small, color: colors.textSecondary }}>No score yet. It appears after the first scan finishes.</Text>
      ) : (
        <>
          <Text style={{ color: scoreColor(score), fontSize: "28px", fontWeight: 600, lineHeight: "36px", margin: "0 0 4px" }}>
            {score}
            <span style={{ color: colors.textSecondary, fontSize: "14px", fontWeight: 400 }}> out of 100</span>
          </Text>
          {business.named ? (
            <Text style={{ ...small, color: colors.text }}>
              {business.named.answers} of {business.named.total} answers named {business.name}.
              {business.rank ? ` Rank #${business.rank.position} of ${business.rank.of} tracked businesses.` : ""}
            </Text>
          ) : null}
          {business.sentence ? <Text style={{ ...small, color: colors.text }}>{business.sentence}</Text> : null}
          {business.reason ? <Text style={{ ...small, color: colors.text }}>{business.reason}</Text> : null}
          <Text style={{ ...small, color: change ? colors.text : colors.textSecondary, fontWeight: change ? 600 : 400 }}>
            {change ? change.text : "No clear change on the 30 days before."}
          </Text>
        </>
      )}
      {business.fixes.length > 0 ? (
        <>
          <Text style={{ ...small, color: colors.text, fontWeight: 600, margin: "12px 0 4px" }}>Top fixes</Text>
          {business.fixes.map((fix) => (
            <Text key={fix.title} style={{ ...small, color: colors.text, margin: "0 0 4px", paddingLeft: "12px" }}>
              {"• "}
              {fix.title}
              <span style={{ color: colors.textSecondary }}> ({fix.where})</span>
            </Text>
          ))}
          {business.moreFixes > 0 ? (
            <Text style={{ ...small, color: colors.textSecondary, margin: "0 0 4px", paddingLeft: "12px" }}>
              and {business.moreFixes} more in the report
            </Text>
          ) : null}
        </>
      ) : null}
      <Text style={{ ...small, margin: "12px 0 0" }}>
        <Link href={business.reportUrl} style={{ color: colors.primary, fontWeight: 600, textDecoration: "underline" }}>
          {business.pdf ? "Open the full report (PDF)" : "See the full report in your dashboard"}
        </Link>
      </Text>
    </Section>
  );
}

const ALL_TOOLS = ["ChatGPT", "Claude", "Perplexity"];
const toolsOf = (business: WeeklyBusiness) => (business.aiTools?.length ? business.aiTools : ALL_TOOLS);

/** "ChatGPT", "ChatGPT and Claude", "ChatGPT, Claude and Perplexity". */
export function joinTools(tools: string[]): string {
  return tools.length <= 1 ? (tools[0] ?? "") : `${tools.slice(0, -1).join(", ")} and ${tools[tools.length - 1]}`;
}

/** The AI tools every business shares, named; null when the businesses use different ones. */
export function sharedTools(businesses: WeeklyBusiness[]): string | null {
  const names = new Set(businesses.map((b) => joinTools(toolsOf(b))));
  return names.size === 1 ? [...names][0] : null;
}

export function weeklyReportPreview(businesses: WeeklyBusiness[]): string {
  const changed = businesses.filter((b) => b.change).length;
  if (changed === 0) return "No big moves this week. Here's where each business stands.";
  return `${changed} ${changed === 1 ? "business" : "businesses"} moved this week`;
}

export default function WeeklyReportEmail({ businesses, baseUrl, unsubscribeUrl }: WeeklyReportEmailProps) {
  const base = baseUrl.replace(/\/$/, "");
  const one = businesses.length === 1;
  const tools = sharedTools(businesses);
  return (
    <EmailLayout preview={weeklyReportPreview(businesses)} baseUrl={baseUrl} unsubscribeUrl={unsubscribeUrl}>
      <EmailHeading>{one ? `How ${businesses[0].name} did this week` : "How your businesses did this week"}</EmailHeading>
      <EmailText>
        Each score is how often {tools ?? "the AI tools chosen for it"} recommended the business over the last 30 days.
        We only mention a change when it&apos;s bigger than the margin of error.
      </EmailText>
      {businesses.map((business, i) => (
        <BusinessBlock key={`${i}-${business.name}`} business={business} showTools={tools === null} />
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
      named: { answers: 23, total: 36 },
      rank: { position: 1, of: 3 },
      sentence: "AI named Bean There Coffee in 23 of 36 answers. Bean House was named in 14.",
      change: { direction: "up", text: "Up 8 points on the 30 days before" },
      fixes: [
        { title: "Add your opening hours to Google", where: "Google Business Profile" },
        { title: "Get listed on Yelp", where: "Review sites" },
        { title: "Publish your menu as plain text", where: "Your website" },
      ],
      moreFixes: 1,
      reportUrl: "https://customers.direct/r/preview-one",
      pdf: true,
    },
    {
      name: "Joe's Plumbing",
      score: 31,
      named: { answers: 11, total: 36 },
      rank: { position: 2, of: 4 },
      sentence: "AI named Joe's Plumbing in 11 of 36 answers. Roto-Rooter was named in 20.",
      change: null,
      fixes: [],
      moreFixes: 0,
      reportUrl: "https://customers.direct/r/preview-two",
      pdf: true,
    },
  ],
  baseUrl: "https://customers.direct",
  unsubscribeUrl: "https://customers.direct/email/unsubscribe?token=preview",
} satisfies WeeklyReportEmailProps;
