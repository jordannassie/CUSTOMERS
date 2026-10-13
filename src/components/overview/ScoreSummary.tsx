import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { MethodPanel, OverviewView } from "@/modules/overview";
import { ScoreDetails } from "./ScoreDetails";
import { ScoreRing } from "./ScoreRing";

// The share page has no details panel, so details are optional.
type Score = Omit<NonNullable<OverviewView["score"]>, "details"> & { details?: MethodPanel };

/**
 * One number, one label, one sentence (MVP_SPEC 5.6), with an arrow only for a real change. `ownQuestions` is the
 * line on the user's own questions, which the score leaves out (BUG-129); `ownChain` the chain's mentions for a
 * business that is one branch, which the score also leaves out (step 7).
 */
export function ScoreSummary({
  score,
  animate = true,
  ownQuestions = null,
  ownChain = null,
}: {
  score: Score;
  animate?: boolean;
  ownQuestions?: string | null;
  ownChain?: string | null;
}) {
  return (
    <div className="flex items-center gap-4 sm:gap-7" data-testid="score-summary">
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
        <p className="max-w-[34ch] text-base leading-snug font-semibold tracking-[-0.02em] sm:text-xl" data-testid="score-sentence">
          {score.sentence}
        </p>
        {score.coverage && (
          <p className="text-sm text-muted-foreground" data-testid="score-coverage">
            {score.coverage}
          </p>
        )}
        {score.firstResults && (
          <p className="text-sm text-muted-foreground">First results. Accuracy improves with every scan.</p>
        )}
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
  );
}
