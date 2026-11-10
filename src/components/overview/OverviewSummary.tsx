import type { ReactNode } from "react";
import { Globe, MessageSquareText, PieChart } from "lucide-react";
import type { OverviewCompete } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import type { SourcesPage } from "@/modules/sources";
import { colorAt, OTHER_SERIES_COLOR } from "@/lib/series-colors";
import { ChangeMark } from "./Panel";
import { ScanChart } from "./ScanChart";
import { ScoreCard } from "./ScoreCard";
import { AnswerDots, CitationBars, ShareDonut, StatRow, citedText, skippedText } from "./StatCards";
import { WhoAiPicks } from "./WhoAiPicks";

type Score = NonNullable<OverviewView["score"]>;

/**
 * The top of the Overview (mockup-ui): the visibility score as the big ring with its explanation, the other three
 * numbers stacked beside it, then the per-scan chart beside "Who AI picks most". The score is always the 30-day mention rate
 * (D-63); the range only changes the chart and the answer counts.
 */
export function OverviewSummary({
  score,
  compete,
  sources,
  ownQuestions,
  ownChain,
  reason = null,
  days,
  nextScan,
}: {
  score: Score;
  /** The score at each scan, oldest first, for the score's small line. */
  compete: OverviewCompete | null;
  sources: SourcesPage | null;
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
      <div className="grid border-b border-border xl:grid-cols-[minmax(0,1fr)_320px]">
        <ScoreCard score={score} reason={reason} ownQuestions={ownQuestions} ownChain={ownChain} />
        {/* The other three numbers: a row of tiles under the score, a column beside it on a wide screen. */}
        <div
          className="grid gap-px border-t border-border bg-border sm:grid-cols-3 xl:grid-cols-1 xl:grid-rows-3 xl:border-t-0 xl:border-l"
          data-testid="overview-kpis"
        >
          <Kpis compete={compete} sources={sources} />
        </div>
      </div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-2 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Visibility at each scan</h2>
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
  const others = sources?.competitorSiteTimes ?? 0;
  const noSite = compete?.ownSite ? !compete.ownSite.hasSite : sources ? sources.ownSite.host === null : false;
  const line = periodLine(compete);
  // Each business in its colour on the "Visibility at each scan" chart; one not drawn there is grey (as WhoAiPicks).
  const color = (name: string) => {
    const i = (compete?.lines ?? []).findIndex((l) => l.name === name);
    return i >= 0 ? colorAt(i) : OTHER_SERIES_COLOR;
  };
  const parts = (compete?.share?.parts ?? []).map((p) => ({ ...p, color: color(p.name) }));
  return (
    <>
      <StatRow
        icon={PieChart}
        label="Share of AI picks"
        testId="kpi-share"
        value={compete?.share ? `${compete.share.percent}%` : <Word>Not yet</Word>}
        sub={compete?.share ? placeText(compete.share) : "Track competitors to compare"}
        visual={<ShareDonut parts={parts} percent={compete?.share?.percent ?? null} />}
      />
      <StatRow
        icon={MessageSquareText}
        label="Answers that named you"
        testId="kpi-named"
        value={period ? `${period.named} of ${period.answers}` : <Word>None yet</Word>}
        sub={
          period && period.answers > 0 ? (
            <>
              {line.change}
              <span>{skippedText(period.named, period.answers)}</span>
            </>
          ) : undefined
        }
        visual={period && period.answers > 0 ? <AnswerDots named={period.named} total={period.answers} /> : undefined}
      />
      <StatRow
        icon={Globe}
        label="Website cited by AI"
        testId="kpi-own-site"
        value={noSite ? <Word>No website saved</Word> : cited === null ? <Word>Not yet</Word> : `${cited} ${cited === 1 ? "time" : "times"}`}
        sub={noSite || cited === null ? undefined : citedText(cited, others)}
        visual={noSite || cited === null ? undefined : <CitationBars yours={cited} theirs={others} />}
      />
    </>
  );
}

/** "#2 by score of 4 businesses"; before any competitor has a score, there is no place to give yet. */
function placeText(share: NonNullable<OverviewCompete["share"]>): string {
  if (share.of < 2) return "No competitor has a score yet";
  return `#${share.rank} by score of ${share.of} businesses`;
}

/** A word in place of a number, a size down so it fits the tile. */
const Word = ({ children }: { children: ReactNode }) => <span className="text-lg tracking-[-0.02em]">{children}</span>;


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
      <span className={"inline-flex shrink-0 items-center gap-1 font-medium tabular-nums text-foreground"} title={moved.text}>
        <ChangeMark up={up} />
        {points} {points === 1 ? "pt" : "pts"}
        <span className="sr-only">, {moved.text}</span>
      </span>
    ),
  };
}
