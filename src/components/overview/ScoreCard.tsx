import { Fragment } from "react";
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
  reason,
  ownQuestions,
  ownChain,
}: {
  score: Score;
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
      className="flex flex-col items-start gap-4 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:py-5"
      data-testid="score-summary"
    >
      {/* The ring on a white disc, so the score is the first thing the eye lands on. */}
      <div className="rounded-full bg-surface p-1.5 shadow-[0_0_0_1px_var(--cd-border),0_8px_24px_-12px_rgb(37_99_235/0.35)]">
        <ScoreRing score={score.value} tone={score.tone} size="hero" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Visibility score, last 30 days</span>
          <span className="text-xs text-text-hint" aria-hidden="true">·</span>
          <span className="text-xs text-muted-foreground" data-testid="confidence-label">
            {score.label}
          </span>
        </div>
        <p className="text-lg leading-snug font-semibold tracking-[-0.02em] text-balance" data-testid="score-sentence">
          {score.sentence}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[length:calc(13px*var(--px,1))]">
          {score.change && (
            <span
              data-testid="score-change"
              className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
            >
              <ChangeMark up={up} />
              {score.change.text}
            </span>
          )}
          {score.details && (
            <span className="[&_button]:text-[length:calc(13px*var(--px,1))]">
              <ScoreDetails panel={score.details} />
            </span>
          )}
        </div>
        {notes.length > 0 && (
          <p className="max-w-[calc(640px*var(--px,1))] text-xs leading-relaxed text-muted-foreground tabular-nums">
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
