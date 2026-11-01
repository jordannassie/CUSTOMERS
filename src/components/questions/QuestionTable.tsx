"use client";

import { Eye, EyeOff, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { questionsHref } from "@/lib/questions-href";
import { rowHasAnswers, type QuestionRow } from "@/modules/questions/service";
import { Button } from "@/components/ui/button";
import { QuestionFilters } from "./QuestionFilters";
import { QuestionItem, type QuestionActions } from "./QuestionItem";
import { useQuestions } from "./QuestionsProvider";

// Named (ring), question, each AI, top picks, recent checks, menu. The header and every row share it.
const GRID = "lg:grid-cols-[84px_minmax(0,1fr)_96px_80px_112px_36px] lg:gap-x-4";

type Props = { limitMessage: string | null; actions: QuestionActions };

export function QuestionTable({ limitMessage, actions }: Props) {
  const { view, shown, total, showPaused, setShowPaused, setFilter, setTopic, setQuery, focus } = useQuestions();
  const router = useRouter();
  const count = shown.active.length + shown.paused.length;
  const noneYet = view.active.length > 0 && !view.active.some(rowHasAnswers);
  const rows = (list: QuestionRow[]) => list.map((q) => <QuestionItem key={q.id} question={q} limitMessage={limitMessage} actions={actions} gridClass={GRID} />);

  if (view.active.length === 0 && (view.paused.length === 0 || !showPaused)) {
    const paused = view.paused.length;
    return (
      <div data-testid="no-questions" className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-surface px-5 py-8">
        <MessageSquarePlus className="size-5 text-text-hint" aria-hidden="true" />
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{paused > 0 ? "All your questions are paused" : "No questions yet"}</h2>
        <p className="text-[13px] text-muted-foreground">
          {paused > 0 ? "Scans check nothing until you resume a question or add a new one." : "Add a question below and the next scan will check it."}
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
    <section aria-labelledby="questions-list-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <h2 id="questions-list-title" className="sr-only">
        Your questions
      </h2>
      <QuestionFilters />
      {noneYet && (
        <p className="border-b border-border bg-muted/60 px-4 py-2 text-[13px] text-muted-foreground" data-testid="no-answers-yet">
          No answers yet. Results show here after your next scan.
        </p>
      )}

      <div className={`hidden border-b border-border bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid ${GRID}`} aria-hidden="true">
        <span>Named</span>
        <span>Question, click to see the answers</span>
        <span>Each AI</span>
        <span>Top picks</span>
        <span>Recent checks</span>
        <span />
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-start gap-3 px-4 py-6" data-testid="no-matches">
          <p className="text-[13px] text-muted-foreground">
            {focus.site ? `No answers in the last 30 days used ${focus.site} for these questions.` : "No questions match these filters."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFilter("all");
              setTopic(null);
              setQuery("");
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
            <ul data-testid="active-questions" aria-label="Being checked" className="divide-y divide-border">
              {rows(shown.active)}
            </ul>
          )}
          {shown.paused.length > 0 && (
            <div data-testid="paused-questions" className="border-t border-border">
              <p className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                Paused: not checked and no credits used. Past results stay until they are 30 days old.
              </p>
              <ul aria-label="Paused" className="divide-y divide-border border-t border-border">
                {rows(shown.paused)}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5">
        <p className="text-xs text-muted-foreground tabular-nums" data-testid="showing-count">
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
