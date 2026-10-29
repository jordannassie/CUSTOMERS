"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { questionsHref } from "@/lib/questions-href";
import { rowHasAnswers, type QuestionRow } from "@/modules/questions/service";
import { Button } from "@/components/ui/button";
import { QuestionFilters } from "./QuestionFilters";
import { QuestionItem, type QuestionActions } from "./QuestionItem";
import { useQuestions } from "./QuestionsProvider";

// Tailwind needs whole class names, so one per number of chosen models: question, the AIs, named, trend, menu.
const GRID: Record<number, string> = {
  0: "lg:grid-cols-[minmax(0,1fr)_64px_72px_36px]",
  1: "lg:grid-cols-[minmax(0,1fr)_112px_64px_72px_36px]",
  2: "lg:grid-cols-[minmax(0,1fr)_repeat(2,112px)_64px_72px_36px]",
  3: "lg:grid-cols-[minmax(0,1fr)_repeat(3,112px)_64px_72px_36px]",
};

type Props = { limitMessage: string | null; actions: QuestionActions };

export function QuestionTable({ limitMessage, actions }: Props) {
  const { view, shown, total, showPaused, setShowPaused, setFilter, setTopic, focus } = useQuestions();
  const router = useRouter();
  const grid = `${GRID[view.models.length] ?? GRID[3]} lg:items-start lg:gap-x-5`;
  const count = shown.active.length + shown.paused.length;
  const noneYet = view.active.length > 0 && !view.active.some(rowHasAnswers);
  const rows = (list: QuestionRow[]) => list.map((q) => <QuestionItem key={q.id} question={q} limitMessage={limitMessage} actions={actions} gridClass={grid} />);

  if (view.active.length === 0 && (view.paused.length === 0 || !showPaused)) {
    const paused = view.paused.length;
    return (
      <div data-testid="no-questions" className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-5">
        <h2 className="text-base font-semibold tracking-[-0.02em]">{paused > 0 ? "All your questions are paused" : "No questions yet"}</h2>
        <p className="text-sm text-muted-foreground">
          {paused > 0 ? "Scans check nothing until you resume a question or add a new one." : "Add a question above and the next scan will check it."}
        </p>
        {paused > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPaused(true)}>
            <Eye aria-hidden="true" />
            Show paused ({paused})
          </Button>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="questions-list-title" className="flex flex-col gap-4 rounded-md border border-border bg-surface pt-5">
      <div className="flex flex-col gap-3 px-5">
        <h2 id="questions-list-title" className="text-base font-semibold tracking-[-0.02em]">
          Your questions
        </h2>
        <QuestionFilters />
        {noneYet && (
          <p className="rounded-sm bg-muted px-3 py-2 text-[13px] text-muted-foreground" data-testid="no-answers-yet">
            No answers yet. Results show here after your next scan.
          </p>
        )}
      </div>

      <div>
        <div className={`hidden gap-3 border-y border-border bg-muted px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid ${grid}`} aria-hidden="true">
          <span>Question, click to see the answers</span>
          {view.models.map((m) => (
            <span key={m.id}>{m.label}</span>
          ))}
          <span>Named</span>
          <span>Trend</span>
          <span />
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-start gap-3 border-t border-border px-5 py-6 lg:border-t-0" data-testid="no-matches">
            <p className="text-sm text-muted-foreground">
              {focus.site ? `No answers in the last 30 days used ${focus.site} for these questions.` : "No questions match these filters."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFilter("all");
                setTopic(null);
                // A link from Compare or Sources (?site=, ?named=, ?ai=) narrows the list too, so it is cleared as well.
                if (focus.site || focus.named || focus.ai) router.push(questionsHref());
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            {shown.active.length > 0 && (
              <ul data-testid="active-questions" aria-label="Being checked" className="divide-y divide-border border-t border-border lg:border-t-0">
                {rows(shown.active)}
              </ul>
            )}
            {shown.paused.length > 0 && (
              <div data-testid="paused-questions" className="border-t border-border">
                <p className="bg-muted px-5 py-2 text-xs font-medium text-muted-foreground">
                  Paused: not checked and no credits used. Past results stay until they are 30 days old.
                </p>
                <ul aria-label="Paused" className="divide-y divide-border border-t border-border">
                  {rows(shown.paused)}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-[13px] text-muted-foreground tabular-nums" data-testid="showing-count">
          Showing {count} of {total} {showPaused ? "questions" : "active questions"}
        </p>
        {view.paused.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPaused(!showPaused)} data-testid="show-paused">
            {showPaused ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {showPaused ? "Hide paused" : `Show paused (${view.paused.length})`}
          </Button>
        )}
      </div>
    </section>
  );
}
