"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { topicsOf } from "@/modules/questions/list";
import type { QuestionRow } from "@/modules/questions/service";
import type { QuestionAction } from "./AddQuestionForm";
import { creditChangeText } from "./credits";
import { EditQuestionForm, type EditAction } from "./EditQuestionForm";
import { ControlButtons, RemoveDialog, RowMenu, type ControlHandlers } from "./QuestionControls";
import { QuestionDetails, type AnswersAction, type AnswersState } from "./QuestionDetails";
import { useQuestions } from "./QuestionsProvider";
import { ResultPips } from "./ResultPips";
import { NamedCell, RowMeta, TrendCell } from "./RowCells";

export type QuestionActions = { edit: EditAction; setActive: QuestionAction; remove: QuestionAction; answers: AnswersAction };

type Props = { question: QuestionRow; limitMessage: string | null; actions: QuestionActions; gridClass: string };

// Clicks on these inside a row do their own thing, so they never open or close it.
const OWN_CLICK = "button, a, input, textarea, label";

/** One question: its results in a row, and opened in place, what each AI answered. */
export function QuestionItem({ question, limitMessage, actions, gridClass }: Props) {
  const { view, openId, toggle, focus } = useQuestions();
  const open = openId === question.id;
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [answers, setAnswers] = useState<AnswersState>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loaded = useRef(false);
  const self = useRef<HTMLLIElement>(null);
  const ids = { businessId: view.businessId, questionId: question.id };
  const activeCount = view.active.length;
  const models = view.models.length;
  const fewer = creditChangeText(activeCount, -1, models, view.frequency);
  // Only suggested questions count in the score, so only they change it when paused, removed or edited (BUG-129).
  const scoreNote = (verb: "Paused" | "Removed") => (question.custom ? "" : ` ${verb} questions stop counting in your score, so your score may change.`);

  // The answers load the first time the question opens, and stay for the visit.
  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    actions
      .answers(ids)
      .catch(() => null)
      .then((result) => {
        if (!result) return setAnswers({ error: "We couldn't load the answers. Try again in a minute." });
        setAnswers(result.ok ? { answers: result.data.answers } : { error: result.error });
      });
    // ids is rebuilt every render; the question id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question.id, actions]);

  // A question opened from a link (?q=) scrolls into view once.
  useEffect(() => {
    if (focus.q === question.id) self.current?.scrollIntoView({ block: "start" });
  }, [focus.q, question.id]);

  function run(action: QuestionAction, input: object, success: string, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action({ ...ids, ...input });
      if (!result.ok) return setError(result.error);
      after?.();
      toast.success(success);
    });
  }

  const handlers: ControlHandlers = {
    question,
    pending,
    limitMessage,
    onEdit: () => {
      setError(null);
      setEditing(true);
    },
    onActive: (active) =>
      run(
        actions.setActive,
        { active },
        active ? `Question resumed. ${creditChangeText(activeCount, 1, models, view.frequency)}.` : `Question paused. ${fewer}.${scoreNote("Paused")}`,
      ),
    onRemove: () => setConfirmRemove(true),
  };

  function rowClick(e: React.MouseEvent) {
    // Menus and dialogs render elsewhere in the page, but their clicks still bubble here through React.
    const target = e.target as HTMLElement;
    if (editing || !e.currentTarget.contains(target) || target.closest(OWN_CLICK)) return;
    toggle(question.id);
  }

  const detailsId = `question-details-${question.id}`;
  return (
    <li ref={self} data-testid="question-row" data-open={open || undefined} className={cn("scroll-mt-4", !question.active && "text-muted-foreground")}>
      {/* The whole row opens the question for a mouse; the question's own button does it for a keyboard. */}
      <div className={cn("relative grid cursor-pointer gap-3 px-5 py-4 transition-colors duration-150 hover:bg-muted/50", open && "bg-muted/50", gridClass)} onClick={rowClick}>
        <div className="flex min-w-0 flex-col gap-1.5 pr-10 lg:pr-0">
          {editing ? (
            <EditQuestionForm
              businessId={view.businessId}
              question={question}
              edit={actions.edit}
              onDone={() => setEditing(false)}
              topics={topicsOf([...view.active, ...view.paused])}
            />
          ) : (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => toggle(question.id)}
              className="flex items-start gap-1.5 rounded-xs text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronRight
                className={cn("mt-0.5 size-4 shrink-0 text-text-hint transition-transform duration-150", open && "rotate-90")}
                aria-hidden="true"
              />
              <span data-testid="question-text" className={cn("text-sm wrap-break-word", question.active && "font-medium text-foreground")}>
                {question.text}
              </span>
            </button>
          )}
          {!editing && (
            <div className="flex flex-col gap-1.5 pl-5.5">
              <RowMeta question={question} />
            </div>
          )}
          {error && (
            <p role="alert" className="text-[13px] text-low-text">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 lg:contents">
          {question.results.map((r) => (
            <ResultPips key={r.model} result={r} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 lg:contents">
          <NamedCell question={question} />
          <TrendCell question={question} />
        </div>

        <div className="absolute top-3 right-3 lg:static lg:self-start">
          <RowMenu {...handlers} />
        </div>
      </div>

      {open && (
        <div id={detailsId}>
          <QuestionDetails question={question} businessName={view.businessName} state={answers} controls={<ControlButtons {...handlers} />} />
        </div>
      )}

      <RemoveDialog
        question={question}
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        pending={pending}
        fewer={fewer}
        scoreNote={scoreNote("Removed")}
        onConfirm={() => run(actions.remove, {}, question.active ? `Question removed. ${fewer}.` : "Question removed.", () => setConfirmRemove(false))}
      />
    </li>
  );
}
