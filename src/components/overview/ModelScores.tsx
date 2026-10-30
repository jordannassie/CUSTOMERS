import { cn } from "cn";
import type { OverviewView } from "@/modules/overview";
import { PointsChange } from "./PointsChange";

const BAR: Record<OverviewView["models"][number]["id"], string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
};

// BUG-074: an AI that failed every check says so, instead of looking like it has never been asked. One left out of
// the scan because it was unavailable says that instead.
function emptyLabel(m: OverviewView["models"][number]): string {
  if (m.skipped) return "Skipped, unavailable";
  return m.notChecked ? "Couldn't be checked" : "No checks yet";
}

/** Per-model scores, always next to the overall score (D-91). Model colours mark the dot and bar only. */
export function ModelScores({ models, period = "week" }: { models: OverviewView["models"]; period?: "week" | "month" }) {
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
              {m.change && <PointsChange change={m.change} period={period} />}
              <span className="font-semibold tabular-nums">
                {m.score === null ? <span className="font-normal text-text-hint">{emptyLabel(m)}</span> : m.score}
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
