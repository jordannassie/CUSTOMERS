"use client";

import { useState, useTransition } from "react";
import { Lightbulb, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { QUESTION_MAX_LENGTH, QUESTION_MIN_LENGTH } from "@/modules/questions/schema";
import { creditChangeText } from "./credits";
import type { ScanFrequency } from "@/modules/credits/estimate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type QuestionAction = (input: unknown) => Promise<ActionResult<null>>;

type Props = {
  businessId: string;
  /** From the Questions page view: a question our own rules keep (step 6c). */
  example: string;
  activeCount: number;
  models: number;
  frequency: ScanFrequency;
  limitMessage: string | null;
  add: QuestionAction;
};

/**
 * "Add question" (owner, 2026-11-17): a small button at the end of the list's toolbar that opens a box to write the
 * question, instead of a form under the list. The box says how to write it and offers the example.
 */
export function AddQuestionDialog({ businessId, example, activeCount, models, frequency, limitMessage, add }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = limitMessage !== null;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (text.trim().length < QUESTION_MIN_LENGTH) return setError("Write the question the way a customer would ask it.");
    startTransition(async () => {
      const result = await add({ businessId, text });
      if (!result.ok) return setError(result.error);
      setText("");
      setOpen(false);
      toast.success(`Question added. ${creditChangeText(activeCount, 1, models, frequency)}.`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Button type="button" size="sm" onClick={() => setOpen(true)} data-testid="open-add-question" className="shrink-0">
        <Plus aria-hidden="true" />
        Add question
      </Button>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} aria-label="Add a question" className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New question</DialogTitle>
            <DialogDescription>Write it the way a customer would ask, and include your city.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Textarea
              id="new-question"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // One line is a question: Enter adds it, as in a search box.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={3}
              maxLength={QUESTION_MAX_LENGTH}
              disabled={full || pending}
              autoFocus
              placeholder={`For example: ${example}`}
              aria-label="Add your own question"
              aria-describedby={full ? "new-question-effect" : undefined}
              aria-invalid={error ? true : undefined}
              className="min-h-20 resize-none text-[length:calc(14px*var(--px,1))]"
            />
            <div className="flex items-start justify-between gap-3 text-xs">
              {full ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={() => setText(example)}
                  className="inline-flex min-w-0 items-start gap-1.5 rounded-sm text-left text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  data-testid="use-example"
                >
                  <Lightbulb className="mt-px size-3.5 shrink-0 text-text-hint" aria-hidden="true" />
                  <span>
                    Try: <span className="text-foreground">{example}</span>
                  </span>
                </button>
              )}
              <span className="shrink-0 text-text-hint tabular-nums">
                {text.length}/{QUESTION_MAX_LENGTH}
              </span>
            </div>
            {error && (
              <p role="alert" className="text-[length:calc(13px*var(--px,1))] text-low-text">
                {error}
              </p>
            )}
          </div>

          {/* Kept simple (owner, 2026-11-17): only the plan's limit is said here, when it is reached. */}
          {full && (
            <p id="new-question-effect" data-testid="question-limit" className="rounded-md bg-mid-bg px-3 py-2 text-[length:calc(13px*var(--px,1))] text-mid-text">
              {limitMessage}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={full || pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Add question
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
