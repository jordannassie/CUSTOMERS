import { Leaderboard } from "@/components/competitors/Leaderboard";
import { SignalsTable } from "@/components/competitors/SignalsTable";
import { ModelScores } from "@/components/overview/ModelScores";
import { ScoreSummary } from "@/components/overview/ScoreSummary";
import { TrendChart } from "@/components/overview/TrendChart";
import { Badge } from "@/components/ui/badge";
import type { ReportView } from "@/modules/reports";
import { ReportReady } from "./ReportReady";

const IMPACT = {
  high: { label: "High impact", variant: "low" },
  medium: { label: "Medium impact", variant: "mid" },
  low: { label: "Low impact", variant: "secondary" },
} as const;

/** The read-only client report (B-59, MVP_SPEC 8.3). Same content on screen, in print and in the PDF (B-60). */
export function Report({ report, logoSrc }: { report: ReportView; logoSrc: string | null }) {
  const { score, competitors } = report;
  return (
    <article className="report mx-auto flex w-full max-w-[880px] flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-8">
        <div className="flex flex-col items-start gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own route, sized by the agency's upload
              <img src={logoSrc} alt="" className="h-10 w-auto max-w-40 object-contain" data-testid="agency-logo" />
            )}
            <span className="min-w-0 text-sm font-semibold break-words" data-testid="agency-name">
              {report.agency.name}
            </span>
          </div>
          <span className="shrink-0 text-[13px] text-muted-foreground">Prepared {report.preparedOn}</span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-balance">{report.businessName}</h1>
          <p className="text-[15px] text-muted-foreground" data-testid="report-period">
            How often AI recommends this business, {report.period}
          </p>
        </div>
      </header>

      <Section title="Visibility score, last 30 days">
        {score ? (
          <div className="flex flex-col gap-8">
            <ScoreSummary score={score} animate={false} />
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_260px] print:grid-cols-[minmax(0,1fr)_220px]">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Last 7 days</h3>
                <TrendChart trend={report.trend} />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">Score by AI</h3>
                <ModelScores models={report.models} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="no-score">
            No score yet. The first scan has not finished, so there is nothing to show for these 30 days.
          </p>
        )}
      </Section>

      {competitors.count > 0 && (
        <>
          <Section title="Who AI recommends most" note="Share of customer questions where each business was recommended.">
            {competitors.hasScore ? (
              <Leaderboard view={competitors} />
            ) : (
              <p className="text-sm text-muted-foreground">Competitor scores appear after the first scan.</p>
            )}
          </Section>
          <Section title="Side by side on Google" note="What customers and AI see about each business on Google.">
            <SignalsTable rows={competitors.signals} />
          </Section>
        </>
      )}

      <Section title="What to fix first">
        {report.opportunities.length > 0 ? (
          <ol className="flex flex-col divide-y divide-border" data-testid="report-opportunities">
            {report.opportunities.map((o, i) => (
              <li key={`${i}-${o.title}`} className="flex flex-col items-start gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
                {/* A fixed column so every title starts at the same x, whatever the badge says. */}
                <div className="flex shrink-0 sm:w-28">
                  <Badge variant={IMPACT[o.impact].variant}>{IMPACT[o.impact].label}</Badge>
                </div>
                <span className="text-sm font-medium">{o.title}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing to fix right now.</p>
        )}
      </Section>

      <footer className="border-t border-border pt-5 text-xs text-text-hint">
        <p className="max-w-prose">
          Scores come from asking ChatGPT, Claude and Perplexity the questions local customers ask, with web search and
          the business location. Answers in the apps themselves can differ. No one can guarantee AI recommendations.
        </p>
      </footer>
      <ReportReady />
    </article>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="report-section flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}
