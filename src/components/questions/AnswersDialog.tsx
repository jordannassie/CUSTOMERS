"use client";

import type { ActionResult } from "@/modules/auth";
import type { QuestionAnswer } from "@/modules/questions";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocalDate } from "@/components/ui/local-date";
import { Skeleton } from "@/components/ui/skeleton";

export type AnswersAction = (input: { businessId: string; questionId: string }) => Promise<ActionResult<{ answers: QuestionAnswer[] }>>;

/** Null while loading. */
export type AnswersState = { answers: QuestionAnswer[] } | { error: string } | null;

type Props = { question: string; open: boolean; onOpenChange: (open: boolean) => void; state: AnswersState };

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

// BUG-089: what each AI actually said, so a result can be checked against the answer behind it.
export function AnswersDialog({ question, open, onOpenChange, state }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base leading-snug">{question}</DialogTitle>
          <DialogDescription>Each AI&apos;s latest answer from the last 30 days. Answers change from one check to the next.</DialogDescription>
        </DialogHeader>
        {state === null ? (
          <div role="status" aria-busy className="flex flex-col gap-3">
            <span className="sr-only">Loading the answers…</span>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32" />
          </div>
        ) : "error" in state ? (
          <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
            {state.error}
          </p>
        ) : state.answers.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="no-answers">
            No answers yet. They show here after the next scan asks this question.
          </p>
        ) : (
          <ul className="flex flex-col gap-5" data-testid="answers">
            {state.answers.map((a) => (
              <li key={a.model} className="flex flex-col gap-2" data-testid="answer" data-model={a.model}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{a.label}</span>
                  <span className="text-[13px] text-muted-foreground">
                    <LocalDate iso={a.checkedAt} options={SHORT} />
                  </span>
                  <Badge variant={a.namedYou ? "good" : "secondary"}>{a.namedYou ? "Named you" : "Did not name you"}</Badge>
                  {a.reused && (
                    <Badge variant="secondary" title="This answer was reused from an earlier check of the same question in the last 20 hours.">
                      Reused answer
                    </Badge>
                  )}
                </div>
                {a.competitors.length > 0 && (
                  <p className="text-[13px] text-muted-foreground">Competitors it named: {a.competitors.join(", ")}</p>
                )}
                <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-muted px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {a.text}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
