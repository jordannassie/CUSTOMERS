"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { LocalDate } from "@/components/ui/local-date";
import { questionsHref } from "@/lib/questions-href";
import { AnswerPanel } from "./AnswerPanel";
import { useQuestions } from "./QuestionsProvider";

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** "Answers that used yelp.com and named Bean House, not you". */
const AI_LABELS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };

/** "8 ChatGPT answers that used yelp.com and named Bean House, not you". */
function heading(total: number, focus: { site: string | null; named: string | null; ai?: string | null }): string {
  const what = total === 1 ? "answer" : "answers";
  const tool = focus.ai ? `${AI_LABELS[focus.ai] ?? focus.ai} ` : "";
  const parts = [focus.site ? `used ${focus.site}` : null, focus.named ? `named ${focus.named}, not you` : null].filter(Boolean).join(" and ");
  return `${total} ${tool}${what} that ${parts}`;
}

/**
 * Opened from "See the answers" on Compare (?site=, ?named=): the answers themselves, newest first, so the facts behind
 * a reason are on screen without opening each question. The first one starts open.
 */
export function FocusAnswers() {
  const { view, focus } = useQuestions();
  const { answers, total } = view.focusAnswers;
  const [open, setOpen] = useState<Set<number>>(() => new Set(answers.length > 0 ? [0] : []));
  if (!focus.site && !focus.named) return null;
  const toggle = (i: number) =>
    setOpen((now) => {
      const next = new Set(now);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4" data-testid="focus-answers" aria-labelledby="focus-answers-title">
      <div className="flex flex-col gap-1">
        <h2 id="focus-answers-title" className="text-[15px] font-semibold tracking-[-0.01em]">
          {answers.length > 0 ? heading(total, focus) : "No answers match this link"}
        </h2>
        <p className="text-[13px] text-muted-foreground">
          {answers.length > 0
            ? `From the last 30 days, on the suggested questions in your score, newest first${total > answers.length ? `, the latest ${answers.length} shown` : ""}. The questions they answered are listed below.`
            : "None of the answers from the last 30 days did all of this. Remove a filter below to see more."}
        </p>
      </div>
      {answers.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {answers.map((a, i) => {
            const isOpen = open.has(i);
            return (
              <li key={`${a.questionId}-${a.model}-${a.checkedAt}`} data-testid="focus-answer">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(i)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_1rem] items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13.5px] font-medium">{a.question}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.label} · <LocalDate iso={a.checkedAt} options={SHORT} />
                    </span>
                  </span>
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-3 px-3.5 pb-3.5">
                    <div className="overflow-hidden rounded-lg border border-border bg-surface">
                      <AnswerPanel answer={a} businessName={view.businessName} when="Answered" />
                    </div>
                    <Link href={questionsHref({ q: a.questionId })} className="text-[13px] font-medium text-primary hover:underline">
                      Open this question
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
