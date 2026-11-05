import { cn } from "cn";
import { topicsOf } from "@/modules/questions/list";
import type { QuestionRow, QuestionsView } from "@/modules/questions/service";

type Part = { label: string; count: number; className?: string; color?: string };

const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };
// Topics are not businesses, so they never use the coral that marks the leading competitor (Check-in theme).
const TOPIC_COLORS = ["var(--cd-primary)", "var(--cd-primary-lighter)", "var(--cd-competitor-1)", "var(--cd-competitor-2)", "var(--cd-competitor-3)"];
// Inner panel inside the AI message card: the muted surface, 16px corners, no border.
const PANEL = "flex flex-col gap-3 rounded-lg bg-muted px-4 pt-3.5 pb-4";

/** A titled card: the legend with counts, and one bar split in the same parts. */
function SummaryCard({ title, parts, testId }: { title: string; parts: Part[]; testId: string }) {
  const shown = parts.filter((p) => p.count > 0);
  return (
    <section className={PANEL} data-testid={testId} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {shown.map((p) => (
            <li key={p.label} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", p.className)} style={p.color ? { background: p.color } : undefined} aria-hidden="true" />
              <strong className="font-semibold text-foreground tabular-nums">{p.count}</strong> {p.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex h-2.5 origin-left animate-grow-x gap-[3px]" aria-hidden="true">
        {shown.map((p) => (
          <i key={p.label} className={cn("block rounded-full", p.className)} style={{ flex: p.count, ...(p.color ? { background: p.color } : {}) }} />
        ))}
      </div>
    </section>
  );
}

/** How many AI tools named you on a question in the last 30 days, of those that checked it. */
function resultParts(rows: QuestionRow[], models: number): Part[] {
  let all = 0;
  let some = 0;
  let none = 0;
  let notYet = 0;
  for (const r of rows) {
    const checked = r.results.filter((x) => x.checks > 0);
    const named = checked.filter((x) => x.appeared > 0).length;
    if (checked.length === 0) notYet += 1;
    else if (named === 0) none += 1;
    else if (named === r.results.length) all += 1;
    else some += 1;
  }
  const allLabel = models === 1 ? "named you" : models === 2 ? "named by both" : `named by all ${models}`;
  const someLabel = models === 3 ? "named by 1 or 2" : "named by 1";
  return [
    { label: allLabel, count: all, className: "bg-brand" },
    { label: someLabel, count: some, className: "bg-brand-lighter" },
    { label: "not named", count: none, className: "bg-border-strong" },
    { label: "not checked yet", count: notYet, className: "bg-border" },
  ];
}

function topicParts(rows: QuestionRow[]): Part[] {
  const topics = topicsOf(rows);
  const key = (t: string) => t.trim().toLowerCase();
  const parts: Part[] = topics.map((t, i) => ({
    label: t.toLowerCase(),
    count: rows.filter((r) => r.topic && key(r.topic) === key(t)).length,
    color: TOPIC_COLORS[i] ?? "var(--cd-competitor-3)",
  }));
  const untagged = rows.filter((r) => !r.topic).length;
  return [...parts, { label: "no topic", count: untagged, className: "bg-border" }];
}

/** Each AI tool's share of answers that named you, over the active questions. */
function ModelCard({ view }: { view: QuestionsView }) {
  return (
    <section className={PANEL} data-testid="summary-models" aria-label="Each AI">
      <h3 className="text-sm font-semibold">Each AI, recent checks</h3>
      <ul className="flex flex-col gap-2">
        {view.models.map((m) => {
          const results = view.active.flatMap((r) => r.results.filter((x) => x.model === m.id));
          const checks = results.reduce((n, x) => n + x.checks, 0);
          const appeared = results.reduce((n, x) => n + x.appeared, 0);
          const pct = checks ? Math.round((appeared / checks) * 100) : 0;
          return (
            <li key={m.id} className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className={cn("size-2 rounded-full", DOT[m.id])} aria-hidden="true" />
                {m.label}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                <span className={cn("block h-full origin-left animate-grow-x rounded-full", DOT[m.id])} style={{ width: `${pct}%` }} />
              </span>
              <span className="text-muted-foreground tabular-nums">{checks ? `${appeared} of ${checks} answers` : "Not checked yet"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Over the list: the questions by topic (or each AI when no topics are set), and how many AI tools named you. */
export function SummaryBars({ view }: { view: QuestionsView }) {
  if (view.active.length === 0) return null;
  const hasTopics = view.active.some((r) => r.topic);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {hasTopics ? <SummaryCard title="Topics" parts={topicParts(view.active)} testId="summary-topics" /> : <ModelCard view={view} />}
      <SummaryCard title="Results" parts={resultParts(view.active, view.models.length)} testId="summary-results" />
    </div>
  );
}
