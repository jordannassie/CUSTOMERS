import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { WhyPanel } from "@/modules/competitors";

const RESULT = {
  they: { text: "They win", variant: "mid" },
  tie: { text: "Tie", variant: "secondary" },
  you: { text: "You win", variant: "good" },
} as const;

/** Question by question (Compare): how many answers named each of you over 30 days, and who won it. */
export function QuestionsTab({ panel }: { panel: WhyPanel }) {
  const { why } = panel;
  if (why.allQuestions.length === 0) return <p className="text-sm text-muted-foreground">Questions show here after a scan.</p>;
  return (
    <section className="flex flex-col gap-3" data-testid="tab-questions">
      <p className="text-sm text-muted-foreground">How many answers to each question named each of you, last 30 days.</p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Question</th>
              <th className="px-3 py-2 text-right font-medium">{why.name}</th>
              <th className="px-3 py-2 text-right font-medium text-primary">You</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2">
                <span className="sr-only">Answers</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {why.allQuestions.map((q) => {
              const r = q.them > q.you ? RESULT.they : q.you > q.them ? RESULT.you : RESULT.tie;
              return (
                <tr key={q.questionId} data-testid="compare-question">
                  <td className="px-3 py-2.5">{q.question}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                    {q.them} of {q.answers}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-primary tabular-nums whitespace-nowrap">
                    {q.you} of {q.answers}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={r.variant}>{r.text}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link href={`/questions?q=${q.questionId}`} className="text-xs font-medium whitespace-nowrap text-primary hover:underline">
                      See answers
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Where AI looked (Compare): each site the answers used, and how many of those answers named each of you. */
export function WhereLookedTab({ panel }: { panel: WhyPanel }) {
  const { why } = panel;
  if (why.domains.length === 0) return <p className="text-sm text-muted-foreground">No sites cited in these answers yet.</p>;
  return (
    <section className="flex flex-col gap-3" data-testid="tab-sources">
      <p className="text-sm text-muted-foreground">Sites AI used in answers to your questions, and who it named from them.</p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Site</th>
              <th className="px-3 py-2 text-right font-medium">Answers that used it</th>
              <th className="px-3 py-2 text-right font-medium">Named {why.name}</th>
              <th className="px-3 py-2 text-right font-medium text-primary">Named you</th>
              <th className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {why.domains.map((d) => {
              const r = d.result === "they_win" ? RESULT.they : d.result === "you_win" ? RESULT.you : RESULT.tie;
              return (
                <tr key={d.host} data-testid="compare-site">
                  <td className="px-3 py-2.5 font-medium">
                    <Link href={`/questions?site=${encodeURIComponent(d.host)}`} className="hover:underline">
                      {d.host}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{d.answers}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{d.them}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-primary tabular-nums">{d.you}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={r.variant}>{r.text}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
