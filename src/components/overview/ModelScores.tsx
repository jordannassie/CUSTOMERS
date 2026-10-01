import { cn } from "cn";
import type { OverviewView } from "@/modules/overview";
import { PointsChange } from "./PointsChange";

const BAR: Record<OverviewView["models"][number]["id"], string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
};

/** On phones, the per-model scores as one row under the score, so they show in the first screen (DB-015). */
export function ModelScoresRow({ models, className }: { models: OverviewView["models"]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-3 gap-3 border-t border-border pt-4", className)} data-testid="model-scores-row">
      {models.map((m) => (
        <div key={m.id} className="flex min-w-0 flex-col gap-0.5">
          <dt className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className={cn("size-2 shrink-0 rounded-full", BAR[m.id])} aria-hidden="true" />
            {m.label}
          </dt>
          <dd className="flex flex-wrap items-baseline gap-x-1.5 text-base font-semibold tabular-nums">
            {m.score === null ? <span className="text-xs font-normal text-text-hint">No checks yet</span> : m.score}
            {m.change && <PointsChange change={m.change} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Per-model scores, always next to the overall score (D-65). Model colours mark the dot and bar only. */
export function ModelScores({ models }: { models: OverviewView["models"] }) {
  return (
    <ul className="flex flex-col gap-4" data-testid="model-scores">
      {models.map((m) => (
        <li key={m.id} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", BAR[m.id])} aria-hidden="true" />
              {m.label}
            </span>
            <span className="flex items-baseline gap-2">
              {m.change && <PointsChange change={m.change} />}
              <span className="font-semibold tabular-nums">
                {m.score === null ? <span className="font-normal text-text-hint">No checks yet</span> : m.score}
              </span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
            <div className={cn("h-full rounded-xs", BAR[m.id])} style={{ width: `${m.score ?? 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
