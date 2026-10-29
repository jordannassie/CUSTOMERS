"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import type { ActionResult } from "@/modules/auth";
import type { QuestionAnswer } from "@/modules/questions/answers";
import { topPick } from "@/modules/questions/list";
import type { QuestionRow } from "@/modules/questions/service";
import { listText } from "@/modules/questions/skipped";
import { compareHref } from "@/lib/compare-href";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnswerPanel } from "./AnswerPanel";

export type AnswersAction = (input: { businessId: string; questionId: string }) => Promise<ActionResult<{ answers: QuestionAnswer[] }>>;

/** Null while loading. */
export type AnswersState = { answers: QuestionAnswer[] } | { error: string } | null;

const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

type Props = { question: QuestionRow; businessName: string; state: AnswersState; controls: React.ReactNode };

// A question opened in the list (replaces the old answers dialog): each AI's latest answer in a tab, every business
// the AIs named, and the question's own controls.
export function QuestionDetails({ question, businessName, state, controls }: Props) {
  return (
    <div className="flex flex-col gap-5 border-t border-border bg-background px-5 py-5" data-testid="question-details">
      {state === null ? (
        <div role="status" aria-busy className="flex flex-col gap-3">
          <span className="sr-only">Loading the answers…</span>
          <Skeleton className="h-9 w-72 max-w-full" />
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
        <>
          <Tabs defaultValue={state.answers[0].model} className="gap-4" data-testid="answers">
            <TabsList className="h-auto! w-full sm:w-fit">
              {state.answers.map((a) => (
                <TabsTrigger key={a.model} value={a.model} className="h-auto! flex-col gap-0 px-3 py-1 sm:flex-row sm:gap-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", DOT[a.model])} aria-hidden="true" />
                    {a.label}
                  </span>
                  <span className={cn("text-xs font-normal", a.namedYou ? "text-good-text" : "text-muted-foreground")}>
                    {a.namedYou ? "named you" : "not named"}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {state.answers.map((a) => (
              <TabsContent key={a.model} value={a.model} data-testid="answer" data-model={a.model}>
                <AnswerPanel answer={a} businessName={businessName} />
              </TabsContent>
            ))}
          </Tabs>
          <AllNamed question={question} answers={state.answers} businessName={businessName} />
        </>
      )}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">{controls}</div>
    </div>
  );
}

/** Every business the AIs named in their latest answers, you first; a tracked competitor opens its comparison. */
function AllNamed({ question, answers, businessName }: { question: QuestionRow; answers: QuestionAnswer[]; businessName: string }) {
  const ids = new Map((question.summary?.named ?? []).filter((n) => n.competitorId).map((n) => [n.name.toLowerCase(), n.competitorId!]));
  const names = new Map<string, { name: string; tools: number }>();
  for (const a of answers) {
    for (const name of new Set([...a.competitors, ...a.others])) {
      const k = name.toLowerCase();
      names.set(k, { name, tools: (names.get(k)?.tools ?? 0) + 1 });
    }
  }
  const you = answers.filter((a) => a.namedYou).length;
  const pick = topPick(question);
  // The name finder failed on these answers, so the list may be missing businesses they named.
  const unread = answers.filter((a) => !a.namesChecked).map((a) => a.label);
  if (names.size === 0 && you === 0 && unread.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">Businesses named, all tools</p>
      {unread.length > 0 && (
        <p className="text-[13px] text-muted-foreground" data-testid="names-unread">
          We couldn&apos;t read which businesses {listText(unread)} named, so this list may be missing some.
        </p>
      )}
      {(names.size > 0 || you > 0) && (
      <ul className="flex flex-wrap gap-1.5" data-testid="all-named">
        {you > 0 && (
          <li className="rounded-xs bg-primary-tint px-2 py-0.5 text-[13px] font-medium text-primary">
            {businessName} (you){" "}
            <span className="tabular-nums" title={`Named by ${you} of ${answers.length} AI tools`}>
              {you}
              <span className="sr-only"> of {answers.length} AI tools</span>
            </span>
          </li>
        )}
        {[...names.values()]
          .sort((a, b) => b.tools - a.tools || a.name.localeCompare(b.name))
          .map((n) => {
            const id = ids.get(n.name.toLowerCase());
            const body = (
              <>
                {n.name}{" "}
                <span className="text-text-hint tabular-nums" title={`Named by ${n.tools} of ${answers.length} AI tools`}>
                  {n.tools}
                  <span className="sr-only"> of {answers.length} AI tools</span>
                </span>
              </>
            );
            const className = "inline-flex items-center gap-1 rounded-xs border border-border px-2 py-0.5 text-[13px]";
            return (
              <li key={n.name}>
                {id ? (
                  <Link href={compareHref(id, "questions")} className={cn(className, "hover:border-primary/40 hover:text-primary")}>
                    {body}
                  </Link>
                ) : (
                  <span className={className}>{body}</span>
                )}
              </li>
            );
          })}
      </ul>
      )}
      {pick?.competitorId && (
        <Link href={compareHref(pick.competitorId, "questions")} className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-primary hover:underline">
          Compare with {pick.name}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
