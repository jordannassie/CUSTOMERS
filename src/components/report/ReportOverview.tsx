import type { ShownReport } from "@/modules/reports";
import { periodText } from "@/modules/reports/v2/email-text";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 28, 2026" (UTC), as the PDF dates it. */
const dayOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

function Stat({ label, value, sub, testId }: { label: string; value: string; sub: string; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 lg:px-5 lg:first:pl-0 lg:last:pr-0" data-testid={testId}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl leading-tight font-semibold tracking-[-0.02em] tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{sub}</dd>
    </div>
  );
}

/**
 * The shown report's summary page (D-90): its headline, the key numbers and the three short takeaways, all from the
 * frozen snapshot the PDF, the share link and the email read, so the page never shows a number the client does not see.
 */
export function ReportOverview({ report, saved }: { report: ShownReport; saved: boolean }) {
  const { summary } = report;
  const { score, named, rank } = summary;
  const change = score.change ? `${score.change.direction === "up" ? "Up" : "Down"} ${score.change.points} on the 30 days before` : "No clear change on the 30 days before";
  const rankSub = !rank ? "AI named none of the tracked businesses" : rank.position === 1 ? "You lead the tracked businesses" : rank.leader ? `Leader: ${rank.leader.name}, ${rank.leader.score}` : `Of ${rank.of} tracked`;
  const takeaways = [
    { label: "What AI knows", text: report.short.knows },
    { label: "Against your competitors", text: report.short.behind },
    { label: "What to fix first", text: report.short.fixes },
  ];
  return (
    <section aria-labelledby="report-overview" className="flex flex-col gap-5 rounded-md border border-border bg-surface p-5 sm:p-6" data-testid="report-overview">
      <div className="flex flex-col gap-1">
        <h2 id="report-overview" className="text-base font-semibold tracking-[-0.02em] break-words">
          {summary.business.name}
        </h2>
        <p className="text-sm text-muted-foreground" data-testid="report-period">
          Covers {periodText(summary.period)}. {saved ? "Saved" : "Prepared"} {dayOf(report.preparedAt)}.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-lg leading-snug font-semibold tracking-[-0.02em] text-balance break-words" data-testid="report-headline">
          {report.headline}
        </p>
        <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground break-words">{report.lead}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-border py-5 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-border">
        <Stat label="Visibility score" value={`${score.value}/100`} sub={change} testId="fact-score" />
        <Stat label="Answers naming you" value={`${named.answers} of ${named.total}`} sub={`In ${named.questions} of ${named.questionsAsked} questions`} testId="fact-named" />
        <Stat label={rank ? `Rank among ${rank.of} tracked` : "Rank among tracked"} value={rank ? `#${rank.position}` : "None"} sub={rankSub} testId="fact-rank" />
        <Stat label="Fixes" value={String(report.fixes.length)} sub="Also added to Actions" testId="fact-fixes" />
      </dl>

      <dl className="grid gap-4 sm:grid-cols-3">
        {takeaways.map((t) => (
          <div key={t.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs font-semibold">{t.label}</dt>
            <dd className="text-sm text-muted-foreground break-words">{t.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
