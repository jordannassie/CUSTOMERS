"use client";

import { useState, useTransition } from "react";
import { Loader2, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { ScanFrequency } from "@/modules/credits/estimate";
import { QUESTION_MAX_LENGTH } from "@/modules/questions/schema";
import type { QuestionRow } from "@/modules/questions/service";
import { creditChangeText } from "./credits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { QuestionAction } from "./AddQuestionForm";
import { ResultPips } from "./ResultPips";

export type QuestionActions = { edit: QuestionAction; setActive: QuestionAction; remove: QuestionAction };

type Props = {
  businessId: string;
  question: QuestionRow;
  activeCount: number;
  models: number;
  frequency: ScanFrequency;
  /** Set when the plan has no room, so a paused question cannot be resumed. */
  limitMessage: string | null;
  actions: QuestionActions;
  gridClass: string;
};

export function QuestionItem({ businessId, question, activeCount, models, frequency, limitMessage, actions, gridClass }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.text);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = { businessId, questionId: question.id };
  const fewer = creditChangeText(activeCount, -1, models, frequency);

  function run(action: QuestionAction, input: object, success: string, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action({ ...ids, ...input });
      if (!result.ok) return setError(result.error);
      after?.();
      toast.success(success);
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (draft.trim() === question.text) return setEditing(false);
    run(actions.edit, { text: draft }, "Question saved.", () => setEditing(false));
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(question.text);
    setError(null);
  }

  return (
    <li data-testid="question-row" className={cn("relative grid gap-3 px-5 py-4", gridClass, !question.active && "text-muted-foreground")}>
      <div className="flex min-w-0 flex-col gap-1.5 pr-10 lg:pr-0">
        {editing ? (
          <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row" aria-label="Edit question">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={QUESTION_MAX_LENGTH} aria-label="Question" autoFocus />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p data-testid="question-text" className={cn("text-sm wrap-break-word", question.active && "font-medium text-foreground")}>
            {question.text}
          </p>
        )}
        {(question.custom || !question.active) && !editing && (
          <div className="flex gap-1.5">
            {question.custom && <Badge variant="tint">Added by you</Badge>}
            {!question.active && <Badge variant="secondary">Paused</Badge>}
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

      <div className="absolute top-3 right-3 lg:static lg:self-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Options for: ${question.text}`} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            {question.active ? (
              <DropdownMenuItem onSelect={() => run(actions.setActive, { active: false }, `Question paused. ${fewer}.`)}>
                <Pause aria-hidden="true" />
                Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={limitMessage !== null}
                onSelect={() =>
                  run(actions.setActive, { active: true }, `Question resumed. ${creditChangeText(activeCount, 1, models, frequency)}.`)
                }
              >
                <Play aria-hidden="true" />
                Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmRemove(true)}>
              <Trash2 aria-hidden="true" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this question?</DialogTitle>
            <DialogDescription>
              “{question.text}” and its past results will be deleted, and your score will count only the questions you
              keep. To stop checking it for now, pause it instead.
            </DialogDescription>
          </DialogHeader>
          {question.active && <p className="text-sm text-muted-foreground">{fewer}.</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep it</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(actions.remove, {}, question.active ? `Question removed. ${fewer}.` : "Question removed.", () => setConfirmRemove(false))
              }
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Remove question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
