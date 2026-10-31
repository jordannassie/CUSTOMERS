"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { QUESTION_MAX_LENGTH, QUESTION_MIN_LENGTH } from "@/modules/questions/schema";
import { creditChangeText, monthlyCredits } from "./credits";
import type { ScanFrequency } from "@/modules/credits/estimate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function AddQuestionForm({ businessId, example, activeCount, models, frequency, limitMessage, add }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = limitMessage !== null;
  const now = monthlyCredits(activeCount, models, frequency);
  const after = monthlyCredits(activeCount + 1, models, frequency);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (text.trim().length < QUESTION_MIN_LENGTH) return setError("Write the question the way a customer would ask it.");
    startTransition(async () => {
      const result = await add({ businessId, text });
      if (!result.ok) return setError(result.error);
      setText("");
      toast.success(`Question added. ${creditChangeText(activeCount, 1, models, frequency)}.`);
    });
  }

  return (
    <form onSubmit={submit} aria-label="Add a question" className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <label htmlFor="new-question" className="shrink-0 text-[13.5px] font-semibold">
          Add your own question
        </label>
        <Input
          id="new-question"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={QUESTION_MAX_LENGTH}
          disabled={full || pending}
          aria-describedby="new-question-hint new-question-effect"
          aria-invalid={error ? true : undefined}
          className="h-8 text-[13px] md:flex-1"
        />
        <Button type="submit" size="sm" disabled={full || pending} className="md:w-auto">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
          Add question
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-low-text">
          {error}
        </p>
      )}
      <p id="new-question-hint" className="text-xs text-muted-foreground">
        Write it the way a customer would ask, and include your city. For example: {example} We check your own questions on
        every scan, but they don&apos;t count in your score.
      </p>
      {full ? (
        <p id="new-question-effect" data-testid="question-limit" className="rounded-sm bg-mid-bg px-2.5 py-1.5 text-xs text-mid-text">
          {limitMessage}
        </p>
      ) : (
        <p id="new-question-effect" data-testid="add-effect" className="text-xs text-muted-foreground tabular-nums">
          {creditChangeText(activeCount, 1, models, frequency)}: {now.toLocaleString("en-US")} now, about{" "}
          {after.toLocaleString("en-US")} with this question.
        </p>
      )}
    </form>
  );
}
