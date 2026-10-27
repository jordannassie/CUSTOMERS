import type { WhyPanel } from "@/modules/competitors";
import type { QuestionTally } from "@/modules/standing";
import { AnswersBySource, PagesUsed } from "./Gap";
import { ByAi, Score } from "./Versus";

/** "AI answers": the score's own answers, by where AI looked, by question and by AI, and the pages it used. */
export function AnswersTab({ panel }: { panel: WhyPanel }) {
  const { why } = panel;
  return (
    <div className="grid gap-8 lg:grid-cols-2" data-testid="tab-answers">
      <section className="flex flex-col gap-3 lg:col-span-2">
        <h3 className="text-sm font-semibold">Answers by where AI looked</h3>
        <AnswersBySource name={why.name} rows={why.sources} />
      </section>
      <Questions heading="Questions they win" rows={why.questionsTheyWin} empty="AI didn't name them more often than you on any question." testId="questions-they-win" />
      <Questions heading="Questions you win" rows={why.questionsYouWin} empty="AI didn't name you more often than them on any question yet." testId="questions-you-win" />
      {why.assistants.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">By AI</h3>
          <ByAi name={why.name} assistants={why.assistants} />
        </section>
      )}
      {(why.theirPages.length > 0 || why.yourPages.length > 0) && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Website pages AI used</h3>
          <PagesUsed label="Theirs" pages={why.theirPages} testId="their-pages" />
          <PagesUsed label="Yours" pages={why.yourPages} testId="your-pages" />
        </section>
      )}
    </div>
  );
}

function Questions({ heading, rows, empty, testId }: { heading: string; rows: QuestionTally[]; empty: string; testId: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {heading} <span className="font-normal text-muted-foreground">{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border" data-testid={testId}>
          {rows.map((q) => (
            <li key={q.questionId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1">{q.question}</span>
              <Score them={q.them} you={q.you} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
