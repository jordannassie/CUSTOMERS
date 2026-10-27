import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { cn } from "cn";
import { namedPercent, skippedSites, topPick, TREND_TEXT } from "@/modules/questions/list";
import type { QuestionRow } from "@/modules/questions/service";
import { Badge } from "@/components/ui/badge";

/** Under the question: its topic, our labels, the business AI named most and the sites used without you. */
export function RowMeta({ question }: { question: QuestionRow }) {
  const pick = topPick(question);
  const sites = skippedSites(question);
  const badges = question.topic || question.custom || !question.active;
  return (
    <>
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
      {(pick || sites.length > 0) && (
        <p className="text-xs text-muted-foreground" data-testid="question-summary">
          {pick && (
            <span>
              Top pick: <span className="font-medium text-foreground">{pick.name}</span>
            </span>
          )}
          {pick && sites.length > 0 && <span aria-hidden="true"> · </span>}
          {sites.length > 0 && <span>Sites that skipped you: {sites.join(", ")}</span>}
        </p>
      )}
    </>
  );
}

export function NamedCell({ question }: { question: QuestionRow }) {
  const pct = namedPercent(question);
  return (
    <div className="flex flex-col gap-1.5" data-testid="question-named">
      <span className="text-xs text-muted-foreground lg:hidden" aria-hidden="true">
        Named
      </span>
      {pct === null ? (
        <span className="text-[13px] text-text-hint">No answers</span>
      ) : (
        <span className="text-sm font-semibold tabular-nums" title={`Named you in ${question.named} of ${question.answers} answers in the last 30 days`}>
          {pct}%<span className="sr-only">, named you in {question.named} of {question.answers} answers in the last 30 days</span>
        </span>
      )}
    </div>
  );
}

const TREND_STYLE = {
  up: { icon: ArrowUpRight, className: "bg-good-bg text-good-text" },
  same: { icon: Equal, className: "bg-muted text-muted-foreground" },
  down: { icon: ArrowDownRight, className: "bg-low-bg text-low-text" },
} as const;

export function TrendCell({ question }: { question: QuestionRow }) {
  const t = question.trend;
  const Icon = t ? TREND_STYLE[t].icon : null;
  return (
    <div className="flex flex-col gap-1.5" data-testid="question-trend" data-trend={t ?? "none"}>
      <span className="text-xs text-muted-foreground lg:hidden" aria-hidden="true">
        Trend
      </span>
      {t === null ? (
        <span className="text-[13px] text-text-hint" title="Shows once this question has 2 scans">
          Not yet
        </span>
      ) : (
        <span
          className={cn("inline-flex w-fit items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold", TREND_STYLE[t].className)}
          title="The latest scan of this question against the one before"
        >
          {Icon && <Icon className="size-3.5" aria-hidden="true" />}
          {TREND_TEXT[t]}
          <span className="sr-only"> since the scan before</span>
        </span>
      )}
    </div>
  );
}
