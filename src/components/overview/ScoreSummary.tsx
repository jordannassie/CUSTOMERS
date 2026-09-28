import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { MethodPanel, OverviewView } from "@/modules/overview";
import { ScoreDetails } from "./ScoreDetails";
import { ScoreRing } from "./ScoreRing";

// The share page has no details panel, so details are optional.
type Score = Omit<NonNullable<OverviewView["score"]>, "details"> & { details?: MethodPanel };

/** One number, one label, one sentence (MVP_SPEC 5.6), with an arrow only for a real change. */
export function ScoreSummary({ score, animate = true }: { score: Score; animate?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7" data-testid="score-summary">
      <ScoreRing score={score.value} tone={score.tone} animate={animate} />
      <div className="flex min-w-0 flex-col items-start gap-2.5">
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
              {score.change.direction === "up" ? (
                <ArrowUp className="size-3.5" aria-hidden="true" />
              ) : (
                <ArrowDown className="size-3.5" aria-hidden="true" />
              )}
              {score.change.text}
            </span>
          )}
        </div>
        <p className="max-w-[34ch] text-xl leading-snug font-semibold tracking-[-0.02em]" data-testid="score-sentence">
          {score.sentence}
        </p>
        {score.firstResults && (
          <p className="text-sm text-muted-foreground">First results. Accuracy improves with every scan.</p>
        )}
        {score.details && <ScoreDetails panel={score.details} />}
      </div>
    </div>
  );
}
