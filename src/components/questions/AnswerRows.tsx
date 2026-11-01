"use client";

import { Check, Minus } from "lucide-react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "cn";
import { LocalDate } from "@/components/ui/local-date";
import type { QuestionAnswer } from "@/modules/questions/answers";

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };
const COLS = "grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[72px_minmax(0,1fr)_88px_52px]";

/** The answer's first words, without markdown marks, for its row. */
const preview = (text: string) => text.replace(/[*#_`>|]/g, "").replace(/\s+/g, " ").trim();

/**
 * Each AI's latest answer as a row (mockup-ui, PromptWatch-style): whether it named you, the start of the answer with its
 * AI under it, the businesses it named and the date. Each row is a tab; the picked one opens in the details pane beside the list.
 */
export function AnswerRows({ answers, businessName }: { answers: QuestionAnswer[]; businessName: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className={cn(COLS, "border-b border-border bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground")} aria-hidden="true">
        <span>Named you</span>
        <span>Answer</span>
        <span className="hidden sm:block">Businesses</span>
        <span className="text-right">Date</span>
      </div>
      <TabsPrimitive.List aria-label="Answers from each AI" className="flex flex-col">
        {answers.map((a) => {
          const named = [...(a.namedYou ? [businessName] : []), ...a.competitors, ...a.others];
          return (
            <TabsPrimitive.Trigger
              key={a.model}
              value={a.model}
              aria-label={`${a.label} ${a.namedYou ? "named you" : "not named"}`}
              className={cn(
                COLS,
                "w-full border-b border-border/60 px-3.5 py-3 text-left text-[13px] outline-none last:border-b-0 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset data-[state=active]:bg-primary-tint/50 data-[state=active]:shadow-[inset_2px_0_0_var(--primary)]",
              )}
            >
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium",
                  a.namedYou ? "bg-good-bg text-good-text" : "bg-muted text-muted-foreground",
                )}
              >
                {a.namedYou ? <Check className="size-3" aria-hidden="true" /> : <Minus className="size-3" aria-hidden="true" />}
                {a.namedYou ? "Yes" : "No"}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-foreground">{preview(a.text) || "No answer text"}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", DOT[a.model])} aria-hidden="true" />
                  {a.label}
                </span>
              </span>
              <span className="hidden items-center sm:flex" title={named.join(", ")}>
                {named.slice(0, 3).map((n, i) => (
                  <span
                    key={n}
                    aria-hidden="true"
                    className={cn(
                      "grid size-6 place-items-center rounded-full border-2 border-surface text-[10px] font-semibold",
                      i > 0 && "-ml-1.5",
                      n === businessName && a.namedYou ? "bg-primary-tint text-primary-hover" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {n.trim().charAt(0).toUpperCase()}
                  </span>
                ))}
                {named.length > 3 && <span className="ml-1 text-xs text-text-hint">+{named.length - 3}</span>}
                {named.length === 0 && <span className="text-xs text-text-hint">None</span>}
              </span>
              <span className="text-right text-xs text-muted-foreground tabular-nums">
                <LocalDate iso={a.checkedAt} options={SHORT} />
              </span>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
    </div>
  );
}
