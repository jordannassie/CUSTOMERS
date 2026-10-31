import { cn } from "cn";
import type { OverviewCompete } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import { Panel } from "./Panel";
import { PointsChange } from "./PointsChange";

type Model = OverviewView["models"][number];

const DOT: Record<Model["id"], string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

// BUG-074: an AI that failed every check says so; one left out of the last scan because it was unavailable says that.
function emptyLabel(m: Model): string {
  if (m.skipped) return "Skipped, unavailable";
  return m.notChecked ? "Couldn't be checked" : "None";
}

/**
 * "Score by AI tool" (mockup-ui): one cell per AI with its 30-day share of answers that named you, its change on last
 * week, and the competitors it named most. Model colors mark the dot and bar only (D-91).
 */
export function ToolScores({ models, context }: { models: OverviewView["models"]; context: OverviewCompete["modelContext"] }) {
  return (
    <Panel
      title="Score by AI tool"
      help="The share of each AI tool's answers in the last 30 days that named you. Each tool is asked the same questions."
      right="Last 30 days"
      testId="tool-scores"
    >
      <ul className={cn("grid divide-y divide-border sm:divide-x sm:divide-y-0", models.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {models.map((m) => (
          <li key={m.id} className="flex min-w-0 flex-col gap-2 px-[18px] py-4" data-testid="model-score">
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <span className={cn("size-2 rounded-full", DOT[m.id] ?? "bg-muted-foreground")} aria-hidden="true" />
              {m.label}
            </span>
            <span className="flex items-baseline justify-between gap-3">
              {m.score === null ? (
                <span className="py-1.5 text-[13px] text-text-hint">{emptyLabel(m)}</span>
              ) : (
                <span className="text-2xl leading-tight font-semibold tracking-[-0.03em] tabular-nums">
                  {m.score}
                  <small className="ml-0.5 text-sm font-medium tracking-normal text-text-hint">%</small>
                </span>
              )}
              {m.change && <PointsChange change={m.change} />}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className={cn("block h-full rounded-full", DOT[m.id])} style={{ width: `${Math.max(m.score ?? 0, m.score ? 2 : 0)}%` }} />
            </span>
            <span className="text-xs text-muted-foreground">
              {context[m.id] ? `Competitors: ${context[m.id]}` : "No competitor scores yet"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
