import { CHART, RadialBars } from "@/components/charts";
import type { OverviewCompete } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import { PointsChange } from "../PointsChange";

type Model = OverviewView["models"][number];

/** ChatGPT grey, Claude brand blue, Perplexity amber-orange: the Check-in tool colours. */
export const TOOL_COLOR: Record<Model["id"], string> = { openai: CHART.chatgpt, anthropic: CHART.claude, perplexity: CHART.perplexity };

// BUG-074: an AI that failed every check says so; one left out of the last scan because it was unavailable says that.
function emptyLabel(m: Model): string {
  if (m.skipped) return "Skipped, unavailable";
  return m.notChecked ? "Couldn't be checked" : "None";
}

/** "Claude named you in 37% of its answers, Perplexity in 7% and ChatGPT in none." from the 30-day scores. */
export function toolsSentence(models: Model[]): string | null {
  const scored = models.filter((m) => m.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  if (scored.length === 0) return null;
  const part = (m: Model, first: boolean) => {
    const what = m.score === 0 ? "none" : `${m.score}%`;
    return first ? `${m.label} named you in ${what} of its answers` : `${m.label} in ${what}`;
  };
  const parts = scored.map((m, i) => part(m, i === 0));
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `${list}, last 30 days.`;
}

/** The rings beside the first message's lead: one per AI tool, the share of its answers that named you. */
export function ToolRingsChart({ models, center }: { models: Model[]; center: { value: string; caption?: string } }) {
  const summary = models.map((m) => `${m.label} ${m.score === null ? emptyLabel(m).toLowerCase() : `${m.score} percent`}`).join(", ");
  return (
    <RadialBars
      items={models.map((m) => ({ label: m.label, value: m.score, color: TOOL_COLOR[m.id] ?? CHART.grey1 }))}
      center={center}
      ariaLabel={`Share of each AI tool's answers that named you, last 30 days: ${summary}.`}
      className="mx-auto"
    />
  );
}

/** Score by AI tool: each tool's 30-day share, its weekly change, and the competitors it named most. */
export function ToolList({ models, context }: { models: Model[]; context: OverviewCompete["modelContext"] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-3" data-testid="tool-scores" aria-label="Score by AI tool, last 30 days">
      {models.map((m) => (
        <li key={m.id} className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted px-3.5 py-3" data-testid="model-score">
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: TOOL_COLOR[m.id] }} aria-hidden="true" />
              {m.label}
            </span>
            {m.score === null ? (
              <span className="text-[13px] text-muted-foreground">{emptyLabel(m)}</span>
            ) : (
              <strong className="text-[15px] font-bold tabular-nums">{m.score}%</strong>
            )}
          </span>
          {m.change && <PointsChange change={m.change} />}
          <span className="text-xs leading-snug text-muted-foreground">{context[m.id] ? `Competitors: ${context[m.id]}` : "No competitor scores yet"}</span>
        </li>
      ))}
    </ul>
  );
}
