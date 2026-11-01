"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { namedPercent, topicsOf } from "@/modules/questions/list";
import type { QuestionRow } from "@/modules/questions/service";
import { Badge } from "@/components/ui/badge";
import type { QuestionAction } from "./AddQuestionForm";
import { creditChangeText } from "./credits";
import { EditQuestionForm, type EditAction } from "./EditQuestionForm";
import { ControlButtons, RemoveDialog, RowMenu, type ControlHandlers } from "./QuestionControls";
import { QuestionDetails, type AnswersAction, type AnswersState } from "./QuestionDetails";
import { QuestionPanel } from "./QuestionPanel";
import { useQuestions } from "./QuestionsProvider";
import { ResultChip } from "./ResultChip";
import { NamedCell, RowMeta, TrendCell } from "./RowCells";
import { TopPicks } from "./TopPicks";

export type QuestionActions = { edit: EditAction; setActive: QuestionAction; remove: QuestionAction; answers: AnswersAction };

type Props = { question: QuestionRow; limitMessage: string | null; actions: QuestionActions; gridClass: string };

// Clicks on these inside a row do their own thing, so they never open or close it.
const OWN_CLICK = "button, a, input, textarea, label";

/** One question: its results in a row, and opened, a panel from the right with what each AI answered. */
export function QuestionItem({ question, limitMessage, actions, gridClass }: Props) {
  const { view, openId, toggle, focus, shown } = useQuestions();
  const open = openId === question.id;
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [answers, setAnswers] = useState<AnswersState>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [self, setSelf] = useState<HTMLLIElement | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const loaded = useRef(false);
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
    if (focus.q === question.id) self?.scrollIntoView({ block: "start" });
  }, [focus.q, question.id, self]);

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
      // The form is in the row, so an open panel closes first.
      if (open) toggle(question.id);
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
  const list = [...shown.active, ...shown.paused];
  const at = list.findIndex((q) => q.id === question.id);
  const pct = namedPercent(question);
  return (
    <li ref={setSelf} data-testid="question-row" data-open={open || undefined} className={cn("scroll-mt-4", !question.active && "text-muted-foreground")}>
      {/* The whole row opens the question for a mouse; the question's own button does it for a keyboard. */}
      <div
        className={cn(
          "relative grid cursor-pointer grid-cols-[40px_minmax(0,1fr)] gap-x-3 gap-y-2.5 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/60 lg:items-center lg:gap-y-0",
          open && "bg-primary-tint hover:bg-primary-tint",
          gridClass,
        )}
        onClick={rowClick}
      >
        <div className="row-span-3 lg:row-span-1">
          <NamedCell question={question} />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 pr-10 lg:pr-2">
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
              ref={opener}
              type="button"
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls={open ? detailsId : undefined}
              onClick={() => toggle(question.id)}
              className="w-fit rounded-xs text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span data-testid="question-text" className={cn("block text-[13.5px] leading-snug wrap-break-word", question.active && "font-medium text-foreground")}>
                {question.text}
              </span>
            </button>
          )}
          {!editing && <RowMeta question={question} />}
          {error && (
            <p role="alert" className="text-[13px] text-low-text">
              {error}
            </p>
          )}
        </div>

        <div className="col-start-2 flex flex-wrap gap-x-3 gap-y-1.5 lg:col-start-auto lg:flex-nowrap lg:gap-1">
          {question.results.map((r) => (
            <ResultChip key={r.model} result={r} />
          ))}
        </div>
        <div className="hidden lg:flex">
          <TopPicks question={question} />
        </div>
        <div className="col-start-2 lg:col-start-auto">
          <TrendCell question={question} />
        </div>

        <div className="absolute top-2.5 right-2.5 lg:static lg:justify-self-end">
          <RowMenu {...handlers} />
        </div>
      </div>

      <QuestionPanel
        open={open}
        onClose={() => toggle(question.id)}
        container={self}
        id={detailsId}
        title={question.text}
        position={at >= 0 && list.length > 1 ? `Question ${at + 1} of ${list.length}` : null}
        returnFocus={() => opener.current?.focus()}
        facts={[
          { label: "Topic", value: question.topic ? <Badge variant="tint">{question.topic}</Badge> : <span className="text-text-hint">None</span> },
          {
            label: "Named you",
            value:
              pct === null ? (
                <span className="text-text-hint">Not checked yet</span>
              ) : (
                <Badge variant={pct > 0 ? "good" : "low"}>
                  {pct}% of answers ({question.named} of {question.answers})
                </Badge>
              ),
          },
          { label: "Answers, 30 days", value: <span className="font-medium">{question.answers}</span> },
          { label: "In your score", value: question.custom ? "No, added by you" : "Yes" },
          { label: "Status", value: question.active ? "Checked every scan" : <Badge variant="secondary">Paused</Badge> },
        ]}
      >
        <QuestionDetails question={question} businessName={view.businessName} state={answers} controls={<ControlButtons {...handlers} />} />
      </QuestionPanel>

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
