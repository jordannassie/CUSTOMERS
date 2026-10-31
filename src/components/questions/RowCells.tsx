import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { cn } from "cn";
import { namedPercent, skippedSites, topPick, TREND_TEXT } from "@/modules/questions/list";
import type { QuestionRow } from "@/modules/questions/service";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/competitors/Sparkline";

function summaryTitle(pick: string | null, sites: string[]): string {
  return [pick && `Top pick: ${pick}`, sites.length > 0 && `Sites AI used when it skipped you: ${sites.join(", ")}`].filter(Boolean).join(". ");
}

/** Under the question: its topic, our labels, the business AI named most and the sites used without you. */
export function RowMeta({ question }: { question: QuestionRow }) {
  const pick = topPick(question);
  const sites = skippedSites(question);
  const badges = question.topic || question.custom || !question.active;
  return (
    <>
      {(pick || sites.length > 0) && (
        <p className="line-clamp-2 text-xs text-muted-foreground lg:line-clamp-none lg:truncate" data-testid="question-summary" title={summaryTitle(pick?.name ?? null, sites)}>
          {pick && (
            <span>
              Top pick: <span className="font-medium text-foreground">{pick.name}</span>
            </span>
          )}
          {pick && sites.length > 0 && <span aria-hidden="true"> · </span>}
          {sites.length > 0 && <span>Sites AI used when it skipped you: {sites.join(", ")}</span>}
        </p>
      )}
      {badges && (
        <div className="flex flex-wrap gap-1.5">
          {question.topic && (
            <Badge variant="tint" data-testid="question-topic">
              {question.topic}
            </Badge>
          )}
          {question.custom && <Badge variant="outline">Added by you</Badge>}
          {question.custom && (
            <Badge variant="outline" data-testid="not-in-score">
              Not counted in your score
            </Badge>
          )}
          {!question.active && <Badge variant="secondary">Paused</Badge>}
        </div>
      )}
    </>
  );
}

const R = 13;
const C = 2 * Math.PI * R;

/** Ring colour by how often AI named you: green from 70%, amber from 40%, blue above 0, a red dot at 0. */
function ringStroke(pct: number): string {
  if (pct >= 70) return "stroke-good";
  if (pct >= 40) return "stroke-mid";
  return pct > 0 ? "stroke-primary" : "stroke-low";
}

/** The share of answers that named you as a small ring, the number inside. Empty and grey before any answer. */
export function NamedRing({ pct }: { pct: number | null }) {
  // At 0 a tiny arc with round ends draws a dot at the top, so 0 reads as checked, not as missing.
  const arc = pct === null ? 0 : pct === 0 ? 0.01 : (pct / 100) * C;
  return (
    <span className="relative inline-flex size-[34px] shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 34 34" className="absolute inset-0 size-full -rotate-90">
        <circle cx="17" cy="17" r={R} fill="none" strokeWidth="3.5" className="stroke-muted" />
        {pct !== null && (
          <circle
            cx="17"
            cy="17"
            r={R}
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
            className={ringStroke(pct)}
          />
        )}
      </svg>
      <span className={cn("relative text-[10.5px] font-semibold tabular-nums", pct === null && "text-text-hint")}>{pct ?? ""}</span>
    </span>
  );
}

export function NamedCell({ question }: { question: QuestionRow }) {
  const pct = namedPercent(question);
  return (
    <div className="flex flex-col items-center gap-1 lg:flex-row lg:gap-2" data-testid="question-named">
      <NamedRing pct={pct} />
      {pct === null ? (
        <span className="sr-only">No answers</span>
      ) : (
        <span className="flex flex-col leading-tight">
          <span className="sr-only">
            {pct}%, named you in {question.named} of {question.answers} answers in the last 30 days
          </span>
          {/* The count behind the share, so a small number of checks is plain to see (MVP_SPEC 5.6). */}
          <span
            className="text-[11.5px] text-muted-foreground tabular-nums"
            aria-hidden="true"
            data-testid="question-named-count"
            title={`Named you in ${question.named} of ${question.answers} answers in the last 30 days`}
          >
            {question.named} of {question.answers}
          </span>
        </span>
      )}
    </div>
  );
}

/** One point per recent check, oldest first: the share of AI tools that named you in it. */
function checkSeries(question: QuestionRow): number[] {
  const lists = question.results.map((r) => r.pips).filter((p) => p.length > 0);
  const len = Math.max(0, ...lists.map((p) => p.length));
  return Array.from({ length: len }, (_, i) => {
    const at = lists.map((p) => p[p.length - len + i]).filter((v) => v !== undefined);
    return at.length ? at.filter(Boolean).length / at.length : 0;
  });
}

const TREND_STYLE = {
  up: { icon: ArrowUpRight, className: "bg-good-bg text-good-text" },
  same: { icon: Equal, className: "bg-muted text-muted-foreground" },
  down: { icon: ArrowDownRight, className: "bg-low-bg text-low-text" },
} as const;

/** The recent checks as a small line, and the last scan against the one before. */
export function TrendCell({ question }: { question: QuestionRow }) {
  const t = question.trend;
  const series = checkSeries(question);
  const Icon = t ? TREND_STYLE[t].icon : null;
  return (
    <div className={cn("flex items-center gap-2", t === null && series.length < 2 && "max-lg:hidden")} data-testid="question-trend" data-trend={t ?? "none"}>
      {series.length >= 2 && <Sparkline values={series} color={question.named > 0 ? "var(--chart-1)" : "var(--color-competitor-2)"} />}
      {t === null ? (
        series.length < 2 && (
          <span className="text-xs text-text-hint" title="Shows once this question has 2 scans">
            Not yet
          </span>
        )
      ) : (
        <span
          className={cn("inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-[11px] font-semibold", TREND_STYLE[t].className)}
          title="The latest scan of this question against the one before"
        >
          {Icon && <Icon className="size-3" aria-hidden="true" />}
          <span className={cn(series.length >= 2 && "sr-only")}>{TREND_TEXT[t]}</span>
          <span className="sr-only"> since the scan before</span>
        </span>
      )}
    </div>
  );
}
