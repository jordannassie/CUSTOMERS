"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { QUESTION_MAX_LENGTH } from "@/modules/questions/schema";
import { editMakesNewQuestion, newQuestionWarning, rowHasAnswers, type QuestionRow } from "@/modules/questions/service";
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
import { Input } from "@/components/ui/input";

export type EditAction = (input: unknown) => Promise<ActionResult<{ newQuestion: boolean }>>;

type Props = { businessId: string; question: QuestionRow; edit: EditAction; onDone: () => void };

/**
 * Edits one question. A suggested question, or one of the user's own that has answers, is saved as a new question and
 * the old one paused with its results (M2), so the user confirms that first.
 */
export function EditQuestionForm({ businessId, question, edit, onDone }: Props) {
  const [draft, setDraft] = useState(question.text);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startsOver = editMakesNewQuestion({ custom: question.custom, answered: rowHasAnswers(question) });

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await edit({ businessId, questionId: question.id, text: draft });
      setConfirming(false);
      if (!result.ok) return setError(result.error);
      toast.success(result.data.newQuestion ? "Saved as a new question. The old one is paused with its results." : "Question saved.");
      onDone();
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (draft.trim() === question.text) return onDone();
    if (startsOver) return setConfirming(true);
    send();
  }

  return (
    <>
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row" aria-label="Edit question">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={QUESTION_MAX_LENGTH} aria-label="Question" autoFocus />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
      {startsOver && <p className="text-[13px] text-muted-foreground">{newQuestionWarning(question.active)}</p>}
      {error && (
        <p role="alert" className="text-[13px] text-low-text">
          {error}
        </p>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>Save as a new question?</DialogTitle>
            <DialogDescription>
              {newQuestionWarning(question.active)}
              {!question.custom && " The new one counts as your own, so it is not counted in your score."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep editing</Button>
            </DialogClose>
            <Button disabled={pending} onClick={send}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save as new question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
