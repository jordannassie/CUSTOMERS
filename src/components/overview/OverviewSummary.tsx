import type { ReactNode } from "react";
import { cn } from "cn";
import { Globe, MessageSquareText, PieChart } from "lucide-react";
import type { OverviewCompete } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import type { SourcesPage } from "@/modules/sources";
import { ChangeMark } from "./Panel";
import { ScanChart } from "./ScanChart";
import { ScoreCard } from "./ScoreCard";
import { StatRow } from "./StatRow";
import { WhoAiPicks } from "./WhoAiPicks";

type Score = NonNullable<OverviewView["score"]>;

/**
 * The top of the Overview (mockup-ui): the visibility score as the big ring with its explanation, the other three
 * numbers stacked beside it, then the per-scan chart beside "Who AI picks most". The score is always the 30-day mention rate
 * (D-63); the range only changes the chart and the answer counts.
 */
export function OverviewSummary({
  score,
  trend,
  compete,
  sources,
  sample,
  ownQuestions,
  ownChain,
  reason = null,
  days,
  nextScan,
}: {
  score: Score;
  /** The score at each scan, oldest first, for the score's small line. */
  trend: number[];
  compete: OverviewCompete | null;
  sources: SourcesPage | null;
  sample: boolean;
  ownQuestions: string | null;
  ownChain: string | null;
  /** The same likely reason the report and weekly email give (competitors likelyReason). */
  reason?: string | null;
  days: number;
  nextScan: string | null;
}) {
  const timeline = compete?.timeline ?? [];
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="overview-hero">
      {/* Both rows share one column grid, so the dividers line up (the owner's ask). */}
      <div className="grid border-b border-border xl:grid-cols-[minmax(0,1fr)_340px]">
        <ScoreCard score={score} trend={trend} sample={sample} reason={reason} ownQuestions={ownQuestions} ownChain={ownChain} />
        {/* The other three numbers: a row of tiles under the score, a column beside it on a wide screen. */}
        <div
          className="grid gap-px border-t border-border bg-border sm:grid-cols-3 xl:grid-cols-1 xl:grid-rows-3 xl:border-t-0 xl:border-l"
          data-testid="overview-kpis"
        >
          <Kpis compete={compete} sources={sources} />
        </div>
      </div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3 px-[18px] py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">Visibility at each scan</h2>
            <p className="text-xs text-muted-foreground">
              Share of each scan&apos;s answers that named each business, last {days} days.
              {timeline.length > 1 && " Pick a name to hide or show its line."}
            </p>
          </div>
          <ScanChart timeline={timeline} lines={compete?.lines ?? []} days={days} earlier={compete?.earlierScans ?? false} nextScan={nextScan} />
        </div>
        <div className="flex min-w-0 border-t border-border xl:border-t-0 xl:border-l [&>*]:flex-1">
          <WhoAiPicks rows={compete?.stand ?? []} lines={compete?.lines ?? []} />
        </div>
      </div>
    </section>
  );
}

function Kpis({ compete, sources }: { compete: OverviewCompete | null; sources: SourcesPage | null }) {
  const period = compete?.period ?? null;
  // Counted like the report (the score's answers), falling back to the Sources count.
  const cited = compete?.ownSite ? compete.ownSite.cited : sources ? sources.ownSite.answers : null;
  const others = sources?.competitorSiteTimes;
  const line = periodLine(compete);
  return (
    <>
      <StatRow
        icon={PieChart}
        label="Share of AI picks, last 30 days"
        testId="kpi-share"
        value={compete?.share ? `${compete.share.percent}%` : <Word>Not yet</Word>}
        sub={compete?.share ? placeText(compete.share) : "Track competitors to compare"}
      />
      <StatRow
        icon={MessageSquareText}
        label={`Answers that named you, last ${period?.days ?? 30} days`}
        testId="kpi-named"
        value={period ? `${period.named} of ${period.answers}` : <Word>None yet</Word>}
        sub={
          line.change ? (
            <>
              {line.change}
              <span>{line.sub}</span>
            </>
          ) : undefined
        }
      />
      <StatRow
        icon={Globe}
        label="Your website cited by AI, last 30 days"
        testId="kpi-own-site"
        tone={cited === 0 ? "mid" : undefined}
        value={
          compete?.ownSite && !compete.ownSite.hasSite ? (
            <Word>No website saved</Word>
          ) : cited === null ? (
            <Word>Not yet</Word>
          ) : (
            `${cited} ${cited === 1 ? "time" : "times"}`
          )
        }
        sub={others === undefined ? undefined : `Competitor sites: ${others} ${others === 1 ? "time" : "times"}`}
      />
    </>
  );
}

/** The answers' rate against the days before, in points, so a range with more answers never reads as a gain. */
function periodLine(compete: OverviewCompete | null): { sub: string; change?: ReactNode } {
  const period = compete?.period;
  const moved = compete?.periodChange;
  if (!period) return { sub: "No answers yet" };
  if (!moved || period.answers === 0 || period.prevAnswers === 0) return { sub: `Last ${period.days} days` };
  if (moved.direction === "same") return { sub: `Same rate as the ${period.days} days before` };
  const rate = (named: number, answers: number) => Math.round((100 * named) / answers);
  const points = Math.abs(rate(period.named, period.answers) - rate(period.prevNamed, period.prevAnswers));
  const up = moved.direction === "up";
  return {
    sub: `vs the ${period.days} days before`,
    change: (
      <span className={cn("inline-flex shrink-0 items-center gap-1 font-medium tabular-nums", up ? "text-good-text" : "text-low-text")} title={moved.text}>
        <ChangeMark up={up} />
        {points} {points === 1 ? "pt" : "pts"}
        <span className="sr-only">, {moved.text}</span>
      </span>
    ),
  };
}

/** "#2 by score of 4 businesses"; before any competitor has a score, there is no place to give yet. */
function placeText(share: NonNullable<OverviewCompete["share"]>): string {
  if (share.of < 2) return "No competitor has a score yet";
  return `#${share.rank} by score of ${share.of} businesses`;
}

/** A word in place of a number, a size down so it fits the tile. */
const Word = ({ children }: { children: ReactNode }) => <span className="text-lg tracking-[-0.02em]">{children}</span>;
