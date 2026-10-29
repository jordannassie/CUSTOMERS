import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Globe, MessageSquareText, PieChart } from "lucide-react";
import { cn } from "cn";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { Badge } from "@/components/ui/badge";
import type { OverviewCompete } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import type { SourcesPage } from "@/modules/sources";
import { ScoreDetails } from "./ScoreDetails";
import { ScoreRing } from "./ScoreRing";

type Score = NonNullable<OverviewView["score"]>;

/**
 * The top of the Overview (dashboard redesign, 2026-10-27): one card, the score ring with its sentence and notes on
 * the left (MVP_SPEC 5.6), and the three numbers behind it on the right: share of AI picks, answers that named you in
 * the range, and how often AI used your own website.
 */
export function OverviewHero({
  score,
  compete,
  sources,
  sample,
  ownQuestions,
  ownChain,
  reason = null,
}: {
  score: Score;
  compete: OverviewCompete | null;
  sources: SourcesPage | null;
  sample: boolean;
  ownQuestions: string | null;
  ownChain: string | null;
  /** The same likely reason the report and weekly email give (competitors likelyReason). */
  reason?: string | null;
}) {
  const period = compete?.period ?? null;
  // Counted like the report (the score's answers), falling back to the Sources count.
  const cited = compete?.ownSite ? compete.ownSite.cited : sources ? sources.ownSite.answers : null;
  // Rates, not counts: a range with more answers is not a gain by itself.
  const moved = compete?.periodChange ?? null;
  return (
    <section className="grid overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" data-testid="overview-hero">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6" data-testid="score-summary">
        <ScoreRing score={score.value} tone={score.tone} />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Visibility score, last 30 days <SampleDataBadge show={sample} />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="tint" data-testid="confidence-label">
              {score.label}
            </Badge>
            {score.change && (
              <span
                data-testid="score-change"
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium",
                  score.change.direction === "up" ? "bg-good-bg text-good-text" : "bg-low-bg text-low-text",
                )}
              >
                {score.change.direction === "up" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />}
                {score.change.text}
              </span>
            )}
          </div>
          <p className="max-w-[36ch] text-lg leading-snug font-semibold tracking-[-0.02em]" data-testid="score-sentence">
            {score.sentence}
          </p>
          {reason && (
            <p className="max-w-prose text-sm text-muted-foreground" data-testid="likely-reason">
              {reason}
            </p>
          )}
          {score.coverage && (
            <p className="text-sm text-muted-foreground" data-testid="score-coverage">
              {score.coverage}
            </p>
          )}
          {score.firstResults && <p className="text-sm text-muted-foreground">First results. Accuracy improves with every scan.</p>}
          {ownQuestions && (
            <p className="text-sm text-muted-foreground tabular-nums" data-testid="own-questions">
              {ownQuestions}
            </p>
          )}
          {ownChain && (
            <p className="text-sm text-muted-foreground tabular-nums" data-testid="own-chain">
              {ownChain}
            </p>
          )}
          {score.details && <ScoreDetails panel={score.details} />}
        </div>
      </div>

      <dl className="grid divide-y divide-border border-t border-border bg-muted/30 lg:border-t-0 lg:border-l" data-testid="overview-kpis">
        <Stat
          icon={PieChart}
          label="Share of AI picks, last 30 days"
          value={compete?.share ? `${compete.share.percent}%` : "Not yet"}
          sub={compete?.share ? placeText(compete.share) : "Track competitors to compare"}
        />
        <Stat
          icon={MessageSquareText}
          label={period ? `Answers that named you, last ${period.days} days` : "Answers that named you"}
          value={period ? `${period.named} of ${period.answers}` : "None"}
          sub={
            moved === null ? undefined : moved.direction === "same" ? (
              moved.text
            ) : (
              <span className={moved.direction === "up" ? "text-good-text" : "text-low-text"}>{moved.text}</span>
            )
          }
          testId="kpi-named"
        />
        <Stat
          icon={Globe}
          label="Your website cited by AI, last 30 days"
          value={compete?.ownSite && !compete.ownSite.hasSite ? "No website saved" : cited === null ? "Not yet" : `${cited} ${cited === 1 ? "time" : "times"}`}
          tone={cited === 0 ? "mid" : undefined}
          sub={sources ? `Competitor sites: ${sources.competitorSiteTimes} times` : undefined}
          testId="kpi-own-site"
        />
      </dl>
    </section>
  );
}

/** "#2 by score of 4 businesses"; before any competitor has a score, there is no place to give yet. */
function placeText(share: NonNullable<OverviewCompete["share"]>): string {
  if (share.of < 2) return "No competitor has a score yet";
  return `#${share.rank} by score of ${share.of} businesses`;
}

function Stat({ icon: Icon, label, value, sub, tone, testId }: { icon: typeof Globe; label: string; value: string; sub?: ReactNode; tone?: "mid"; testId?: string }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-4" data-testid={testId}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-tint text-primary" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={cn("text-xl font-semibold tracking-[-0.02em] tabular-nums", tone === "mid" && "text-mid-text")}>{value}</dd>
        {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
      </div>
    </div>
  );
}
