"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Named or Not named for one question and model; clicking it shows the answer the model gave, as saved. */
export default function AnswerCell({
  value,
  question,
  model,
  answer,
}: {
  value: boolean | undefined;
  question: string;
  model: string;
  answer: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  if (value === undefined) return <span className="text-text-hint">Not asked</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${value ? "Named" : "Not named"} by ${model}. Show the answer`}
        className="inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {value ? (
          <span className="inline-flex items-center gap-1 text-good-text">
            <Check aria-hidden className="size-4" />
            Named
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Minus aria-hidden className="size-4" />
            Not named
          </span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid="answer-dialog">
          <DialogHeader>
            <DialogTitle>{model}&apos;s answer</DialogTitle>
            <DialogDescription className="wrap-anywhere">{question}</DialogDescription>
          </DialogHeader>
          {answer ? (
            <p className="max-h-[60vh] overflow-y-auto rounded-md border border-border bg-muted px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap wrap-anywhere">
              {answer}
            </p>
          ) : (
            <p className="text-[14px] text-muted-foreground">No answer text was saved for this check.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
