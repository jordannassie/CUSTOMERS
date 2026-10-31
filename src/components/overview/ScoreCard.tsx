import { Fragment } from "react";
import { cn } from "cn";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { Sparkline } from "@/components/competitors/Sparkline";
import { Badge } from "@/components/ui/badge";
import type { OverviewView } from "@/modules/overview";
import { ChangeMark } from "./Panel";
import { ScoreDetails } from "./ScoreDetails";
import { ScoreRing } from "./ScoreRing";

type Score = NonNullable<OverviewView["score"]>;

/**
 * The Overview's headline (mockup-ui): the 30-day visibility score as the big ring, how sure it is, the plain sentence,
 * its weekly change and trend, then the notes behind it and the method panel (MVP_SPEC 5.6). Scores are mention rates,
 * never a rank in AI (D-63).
 */
export function ScoreCard({
  score,
  trend,
  sample,
  reason,
  ownQuestions,
  ownChain,
}: {
  score: Score;
  /** The score at each scan, oldest first. */
  trend: number[];
  sample: boolean;
  reason: string | null;
  ownQuestions: string | null;
  ownChain: string | null;
}) {
  const notes = [
    reason && { id: "likely-reason", text: reason },
    score.coverage && { id: "score-coverage", text: score.coverage },
    score.firstResults && { id: null, text: "First results. Accuracy improves with every scan." },
    ownQuestions && { id: "own-questions", text: ownQuestions },
    ownChain && { id: "own-chain", text: ownChain },
  ].filter((n): n is { id: string | null; text: string } => !!n);
  const up = score.change?.direction === "up";

  return (
    <div
      className="flex flex-col items-start gap-5 bg-primary-tint/40 px-[18px] py-5 sm:flex-row sm:items-center sm:gap-8 sm:px-[18px] sm:py-7"
      data-testid="score-summary"
    >
      {/* The ring on a white disc, so the score is the first thing the eye lands on. */}
      <div className="rounded-full bg-surface p-2.5 shadow-[0_0_0_1px_var(--cd-border),0_8px_24px_-12px_rgb(37_99_235/0.35)]">
        <ScoreRing score={score.value} tone={score.tone} size="hero" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Visibility score, last 30 days</span>
          <Badge variant="tint" data-testid="confidence-label">
            {score.label}
          </Badge>
          <SampleDataBadge show={sample} />
        </div>
        <p className="text-lg leading-snug font-semibold tracking-[-0.02em] text-balance" data-testid="score-sentence">
          {score.sentence}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          {score.change && (
            <span
              data-testid="score-change"
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium",
                up ? "bg-good-bg text-good-text" : "bg-low-bg text-low-text",
              )}
            >
              <ChangeMark up={up} />
              {score.change.text}
            </span>
          )}
          {trend.length >= 2 && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkline values={trend} color="var(--chart-1)" />
              Each scan
            </span>
          )}
          {score.details && (
            <span className="[&_button]:text-[13px]">
              <ScoreDetails panel={score.details} />
            </span>
          )}
        </div>
        {notes.length > 0 && (
          <p className="max-w-[640px] text-xs leading-relaxed text-muted-foreground tabular-nums">
            {notes.map((n, i) => (
              <Fragment key={n.text}>
                {i > 0 && " "}
                <span data-testid={n.id ?? undefined}>{n.text}</span>
              </Fragment>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
