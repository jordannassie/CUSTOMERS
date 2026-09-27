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
  city: string | null;
  activeCount: number;
  models: number;
  frequency: ScanFrequency;
  limitMessage: string | null;
  add: QuestionAction;
};

export function AddQuestionForm({ businessId, city, activeCount, models, frequency, limitMessage, add }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = limitMessage !== null;
  const now = monthlyCredits(activeCount, models, frequency);
  const after = monthlyCredits(activeCount + 1, models, frequency);
  const example = city ? `Who does the best emergency repairs in ${city}?` : "Who does the best emergency repairs near me?";

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
    <form onSubmit={submit} aria-label="Add a question" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-question" className="text-sm font-medium">
          Add your own question
        </label>
        <p id="new-question-hint" className="text-[13px] text-muted-foreground">
          Write it the way a customer would ask, and include your city. For example: {example}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="new-question"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={QUESTION_MAX_LENGTH}
          disabled={full || pending}
          aria-describedby="new-question-hint new-question-effect"
          aria-invalid={error ? true : undefined}
          className="sm:flex-1"
        />
        <Button type="submit" disabled={full || pending} className="sm:w-auto">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
          Add question
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-low-text">
          {error}
        </p>
      )}
      {full ? (
        <p id="new-question-effect" data-testid="question-limit" className="rounded-sm bg-mid-bg px-3 py-2 text-[13px] text-mid-text">
          {limitMessage}
        </p>
      ) : (
        <p id="new-question-effect" data-testid="add-effect" className="text-[13px] text-muted-foreground tabular-nums">
          {creditChangeText(activeCount, 1, models, frequency)}: {now.toLocaleString("en-US")} now, about{" "}
          {after.toLocaleString("en-US")} with this question.
        </p>
      )}
    </form>
  );
}
