import { AiMessage, Explain } from "@/components/checkin";
import { questionKpis } from "@/modules/questions/list";
import type { QuestionsView } from "@/modules/questions/service";
import { KpiStrip } from "./KpiStrip";
import { SummaryBars } from "./SummaryBars";

/** The serif lead: how many active questions named you at least once in the last 30 days. */
function lead(view: QuestionsView): string {
  const k = questionKpis(view.active, view.paused.length);
  if (k.active === 0) return "You have no questions being checked right now.";
  if (k.checked === 0) return `Your ${k.active === 1 ? "question has" : `${k.active} questions have`} no answers yet.`;
  if (k.namedOnce === 0) return `None of your ${k.active} questions named you in the last 30 days.`;
  if (k.namedOnce === k.active) return `Every one of your ${k.active} questions named you at least once in the last 30 days.`;
  return `${k.namedOnce} of your ${k.active} questions named you at least once in the last 30 days.`;
}

/** Each AI's answers that named you, most first: "Claude named you in 22 of its 60 answers, Perplexity in 4 of 60, and ChatGPT in none of 60." */
function byTool(view: QuestionsView): string | null {
  const tools = view.models
    .map((m) => {
      const results = view.active.flatMap((r) => r.results.filter((x) => x.model === m.id));
      return { label: m.label, checks: results.reduce((n, x) => n + x.checks, 0), appeared: results.reduce((n, x) => n + x.appeared, 0) };
    })
    .filter((t) => t.checks > 0)
    .sort((a, b) => b.appeared - a.appeared);
  if (tools.length === 0) return null;
  const parts = tools.map((t, i) => {
    const count = t.appeared === 0 ? "none" : String(t.appeared);
    return i === 0 ? `${t.label} named you in ${count} of its ${t.checks} answers` : `${t.label} in ${count} of ${t.checks}`;
  });
  const sentence = parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}` : parts[0];
  return `${sentence}, from recent checks.`;
}

// Questions as a Check-in conversation: the user's question, then the answer as an AI message with the KPI tiles and
// the summary bars. The full list follows in the next message (page.tsx).
export function QuestionsIntro({ view }: { view: QuestionsView }) {
  const k = questionKpis(view.active, view.paused.length);
  const tools = byTool(view);
  return (
    <>
      <AiMessage place="first" leadSize="lg" lead={lead(view)} index={0} testId="questions-lead">
        {k.active === 0 ? (
          <Explain>Add a question below and the next scan will check it.</Explain>
        ) : k.checked === 0 ? (
          <Explain>Results show here after your next scan.</Explain>
        ) : tools ? (
          <Explain>{tools}</Explain>
        ) : null}
        <div className="rounded-lg bg-muted p-1.5 sm:p-2.5">
          <KpiStrip view={view} />
        </div>
        <SummaryBars view={view} />
      </AiMessage>
    </>
  );
}
