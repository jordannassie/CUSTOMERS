import { LollipopRows } from "@/components/charts";
import { AiMessage, Explain } from "@/components/checkin";
import type { Comparison } from "@/modules/competitors";

type Assistant = { provider: string; assistant: string; answers: number; them: number; you: number };

const share = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);
const none = (n: number) => (n === 0 ? "none" : String(n));

/** The lead and the line under it, from the per-tool counts only. */
function words(name: string, assistants: Assistant[], standing: Comparison["standing"]): { lead: string; explain: string | null } {
  const asked = assistants.filter((a) => a.answers > 0);
  if (asked.length === 0) return { lead: "Each AI tool shows here after a scan.", explain: null };
  const gaps = asked.map((a) => ({ a, d: share(a.them, a.answers) - share(a.you, a.answers) }));
  const sentence = (a: Assistant) => `${a.assistant} named ${name} in ${a.them} of its ${a.answers} answers and you in ${none(a.you)}.`;
  if (standing === "ahead") {
    const best = [...gaps].sort((x, y) => x.d - y.d)[0];
    return best.d < 0 ? { lead: `Your lead is biggest on ${best.a.assistant}.`, explain: sentence(best.a) } : { lead: "Here's how each AI tool compares.", explain: null };
  }
  const behind = gaps.filter((g) => g.d > 0).sort((x, y) => y.d - x.d);
  if (behind.length === 0) return { lead: "No AI tool names them more often than you.", explain: asked.map(sentence).slice(0, 1).join(" ") };
  const total = behind.reduce((s, g) => s + g.d, 0);
  const top = behind[0];
  const lead = top.d >= total * 0.6 ? `Most of the gap comes from ${top.a.assistant}.` : "The gap is spread across the AI tools.";
  return { lead, explain: sentence(top.a) };
}

/**
 * C-Compare's second message: per AI tool, you and them as paired dots on one 0 to 100% scale, with how far ahead or
 * behind you are, and the counts written out under it so colour is never the only cue.
 */
export function ByAi({ data, index }: { data: Comparison; index: number }) {
  const { assistants } = data.panel.why;
  const { lead, explain } = words(data.title, assistants, data.collecting ? null : data.standing);
  return (
    <AiMessage index={index} lead={lead}>
      {explain && <Explain>{explain}</Explain>}
      {assistants.length > 0 ? (
        <div className="flex flex-col gap-3" data-testid="by-ai">
          <LollipopRows
            rivalName={data.title}
            rows={assistants.map((a) => ({
              label: a.assistant,
              you: a.answers > 0 ? share(a.you, a.answers) : null,
              rival: a.answers > 0 ? share(a.them, a.answers) : null,
            }))}
            ariaLabel={`Share of each AI tool's answers that named each of you, last 30 days. ${assistants
              .map((a) => (a.answers > 0 ? `${a.assistant}: you ${share(a.you, a.answers)}%, ${data.title} ${share(a.them, a.answers)}%` : `${a.assistant}: no answers`))
              .join(". ")}.`}
          />
          <ul className="grid gap-2 text-[13px] sm:grid-cols-3">
            {assistants.map((a) => (
              <li key={a.provider} className="flex flex-col rounded-[12px] bg-muted px-3 py-2" data-testid="by-ai-row">
                <span className="font-semibold">{a.assistant}</span>
                {a.answers === 0 ? (
                  <span className="text-muted-foreground">No answers from {a.assistant} in the last 30 days.</span>
                ) : (
                  <span className="text-muted-foreground tabular-nums">
                    You {a.you} of {a.answers}, {data.title} {a.them} of {a.answers}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AiMessage>
  );
}
