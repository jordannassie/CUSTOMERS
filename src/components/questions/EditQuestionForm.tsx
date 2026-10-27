"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { QUESTION_MAX_LENGTH, TOPIC_MAX_LENGTH } from "@/modules/questions/schema";
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

/** `topics`: the ones already in use, offered while typing. */
type Props = { businessId: string; question: QuestionRow; edit: EditAction; onDone: () => void; topics?: string[] };

/**
 * Edits one question. A suggested question, or one of the user's own that has answers, is saved as a new question and
 * the old one paused with its results (M2), so the user confirms that first.
 */
export function EditQuestionForm({ businessId, question, edit, onDone, topics = [] }: Props) {
  const [draft, setDraft] = useState(question.text);
  const [topic, setTopic] = useState(question.topic ?? "");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startsOver = editMakesNewQuestion({ custom: question.custom, answered: rowHasAnswers(question) });
  const textChanged = draft.trim() !== question.text;
  const topicChanged = topic.trim() !== (question.topic ?? "");
  const listId = `topics-${question.id}`;

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await edit({ businessId, questionId: question.id, text: textChanged ? draft : question.text, topic });
      setConfirming(false);
      if (!result.ok) return setError(result.error);
      toast.success(
        result.data.newQuestion ? "Saved as a new question. The old one is paused with its results." : textChanged ? "Question saved." : "Topic saved.",
      );
      onDone();
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!textChanged && !topicChanged) return onDone();
    if (textChanged && startsOver) return setConfirming(true);
    send();
  }

  return (
    <>
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label="Edit question">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={QUESTION_MAX_LENGTH}
          aria-label="Question"
          autoFocus
          className="sm:min-w-64 sm:flex-1"
        />
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={TOPIC_MAX_LENGTH}
          aria-label="Topic"
          placeholder="Topic, like Delivery"
          list={topics.length ? listId : undefined}
          className="sm:w-44"
        />
        {topics.length > 0 && (
          <datalist id={listId}>
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        )}
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
      {startsOver && textChanged && <p className="text-[13px] text-muted-foreground">{newQuestionWarning(question.active)}</p>}
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
