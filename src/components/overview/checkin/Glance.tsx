import { Fragment } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "cn";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { CHART, ScoreGauge, Sparkline } from "@/components/charts";
import { RailCard, StatRows, type StatRow } from "@/components/checkin";
import { Badge } from "@/components/ui/badge";
import { STANDING_TEXT, type OverviewCompete } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import type { SourcesPage } from "@/modules/sources";
import { colorAt, OTHER_SERIES_COLOR } from "@/lib/series-colors";
import { ChangeMark } from "../Panel";
import { ScoreDetails } from "../ScoreDetails";

type Score = NonNullable<OverviewView["score"]>;

/**
 * The right rail's score card (C-Overview "At a glance"): the 30-day visibility score on the gauge, how sure it is, its
 * weekly change, the notes behind it and the method panel. Scores are mention rates, never a rank in AI (D-63).
 */
export function ScoreGlance({ score, sample, notes }: { score: Score; sample: boolean; notes: { id: string | null; text: string }[] }) {
  const up = score.change?.direction === "up";
  return (
    <RailCard title="At a glance" testId="score-summary">
      <ScoreGauge value={score.value} ariaLabel={`Visibility score ${score.value} of 100, last 30 days`} />
      <span className="sr-only" data-testid="score-value">
        {score.value}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant="tint" data-testid="confidence-label">
          {score.label}
        </Badge>
        <SampleDataBadge show={sample} />
        {score.change && (
          <span
            data-testid="score-change"
            className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", up ? "bg-good-bg text-good-text" : "bg-low-bg text-low-text")}
          >
            <ChangeMark up={up} />
            {score.change.text}
          </span>
        )}
      </div>
      {notes.length > 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground tabular-nums">
          {notes.map((n, i) => (
            <Fragment key={n.text}>
              {i > 0 && " "}
              <span data-testid={n.id ?? undefined}>{n.text}</span>
            </Fragment>
          ))}
        </p>
      )}
      {score.details && (
        <span className="text-center [&_button]:text-[13px]">
          <ScoreDetails panel={score.details} />
        </span>
      )}
    </RailCard>
  );
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

/** The numbers under the score: share of AI picks and place, your site and rivals' sites cited. (Answers that named you
 * is the first card's headline, so it is not repeated here.) */
export function NumbersGlance({ compete, sources }: { compete: OverviewCompete | null; sources: SourcesPage | null }) {
  const cited = compete?.ownSite ? compete.ownSite.cited : sources ? sources.ownSite.answers : null;
  const others = sources?.competitorSiteTimes;
  const times = (n: number) => `${n} ${n === 1 ? "time" : "times"}`;
  const rows: StatRow[] = [
    { label: "Share of AI picks", value: compete?.share ? `${compete.share.percent}%` : "Not yet", testId: "kpi-share" },
    ...(compete?.share && compete.share.of >= 2 ? [{ label: "Rank by score", value: `${ordinal(compete.share.rank)} of ${compete.share.of}` }] : []),
    {
      label: "Your site cited",
      value: compete?.ownSite && !compete.ownSite.hasSite ? "No website saved" : cited === null ? "Not yet" : times(cited),
      tone: cited === 0 ? "danger" : undefined,
      testId: "kpi-own-site",
    },
    ...(others === undefined ? [] : [{ label: "Rivals' sites cited", value: times(others) }]),
  ];
  return (
    <RailCard title="By the numbers" testId="overview-kpis">
      <StatRows rows={rows} />
    </RailCard>
  );
}

/** "Who AI picks most": the top businesses by 30-day score, you among them, each with its line's trend and colour. */
export function PicksGlance({ rows, lines, timeline }: { rows: OverviewCompete["stand"]; lines: OverviewCompete["lines"]; timeline: OverviewCompete["timeline"] }) {
  const lineOf = (name: string) => lines.findIndex((l) => l.name === name);
  return (
    <RailCard title="Who AI picks most" testId="where-you-stand">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add competitors to see where you stand.</p>
      ) : (
        <ol className="-mx-2 flex flex-col gap-1">
          {rows.map((r, k) => {
            const i = lineOf(r.name);
            const color = i >= 0 ? colorAt(i) : OTHER_SERIES_COLOR;
            const trend = i >= 0 && timeline.length > 1 ? timeline.map((p) => (typeof p[lines[i].key] === "number" ? (p[lines[i].key] as number) : null)) : null;
            return (
              <li key={r.name} className={cn("grid grid-cols-[18px_minmax(0,1fr)_auto_28px] items-center gap-2.5 rounded-[12px] px-2 py-2.5", r.isYou && "bg-brand-tint-3")}>
                <span className="text-[13px] text-muted-foreground tabular-nums">{k + 1}</span>
                <span className="flex min-w-0 flex-col">
                  <span className={cn("truncate text-sm", r.isYou ? "font-bold" : "font-medium")} title={r.name}>
                    {r.name}
                    {r.isYou && " (you)"}
                  </span>
                  {r.standing && !r.isYou && <span className="text-[11.5px] text-muted-foreground">{STANDING_TEXT[r.standing]}</span>}
                </span>
                {trend ? <Sparkline values={trend} color={color} width={60} /> : <span className="size-2.5 rounded-full" style={{ background: color ?? CHART.grey2 }} aria-hidden="true" />}
                <strong className="text-right font-bold tabular-nums">{r.score}</strong>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-col gap-2">
        {rows.length > 0 && rows.length < 4 && (
          <Link href="/competitors/manage" className="flex items-center gap-2 text-[13px] font-medium text-brand hover:underline">
            <Plus className="size-3.5" aria-hidden="true" />
            Track another competitor
          </Link>
        )}
        <Link
          href="/competitors"
          className="flex min-h-11 items-center justify-center rounded-full border border-brand text-sm font-semibold text-brand transition-colors hover:bg-brand-tint"
        >
          All competitors
        </Link>
      </div>
    </RailCard>
  );
}
