"use client";

import { Check, ExternalLink, Minus } from "lucide-react";
import { cn } from "cn";
import type { ActionResult } from "@/modules/auth";
import type { QuestionAnswer } from "@/modules/questions";
import { answerBlocks, markNames, type Part } from "@/modules/questions/answer-format";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocalDate } from "@/components/ui/local-date";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AnswersAction = (input: { businessId: string; questionId: string }) => Promise<ActionResult<{ answers: QuestionAnswer[] }>>;

/** Null while loading. */
export type AnswersState = { answers: QuestionAnswer[] } | { error: string } | null;

type Props = { question: string; businessName: string; open: boolean; onOpenChange: (open: boolean) => void; state: AnswersState };

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

// BUG-089: what each AI actually said, one AI per tab, with every business it named marked in the text.
export function AnswersDialog({ question, businessName, open, onOpenChange, state }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base leading-snug">{question}</DialogTitle>
          <DialogDescription>Each AI&apos;s latest answer from the last 30 days.</DialogDescription>
        </DialogHeader>
        {state === null ? (
          <div role="status" aria-busy className="flex flex-col gap-3">
            <span className="sr-only">Loading the answers…</span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40" />
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
          <Tabs defaultValue={state.answers[0].model} className="min-h-0 flex-1 gap-4" data-testid="answers">
            <TabsList className="w-full sm:w-fit">
              {state.answers.map((a) => (
                <TabsTrigger key={a.model} value={a.model} className="gap-1.5 px-3">
                  <span className={cn("size-2 rounded-full", DOT[a.model])} aria-hidden="true" />
                  {a.label}
                  {a.namedYou ? (
                    <Check className="size-3.5 text-good-text" aria-label="named you" />
                  ) : (
                    <Minus className="size-3.5 text-text-hint" aria-label="did not name you" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {state.answers.map((a) => (
              <TabsContent key={a.model} value={a.model} className="flex min-h-0 flex-col gap-4 overflow-y-auto" data-testid="answer" data-model={a.model}>
                <Answer answer={a} businessName={businessName} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Answer({ answer: a, businessName }: { answer: QuestionAnswer; businessName: string }) {
  const named = [...(a.namedYou ? [{ name: businessName, kind: "you" as const }] : []), ...a.competitors.map((name) => ({ name, kind: "tracked" as const })), ...a.others.map((name) => ({ name, kind: "other" as const }))];
  const others = [...a.competitors, ...a.others];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <Badge variant={a.namedYou ? "good" : "secondary"}>{a.namedYou ? "Named you" : "Did not name you"}</Badge>
        <span className="text-muted-foreground">
          <LocalDate iso={a.checkedAt} options={SHORT} />
        </span>
        {a.reused && (
          <Badge variant="outline" title="This answer was reused from an earlier check of the same question in the last 20 hours.">
            Reused answer
          </Badge>
        )}
      </div>

      {named.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Businesses it named</p>
          <ul className="flex flex-wrap gap-1.5" data-testid="answer-named">
            {named.map((n) => (
              <li
                key={`${n.kind}-${n.name}`}
                className={cn(
                  "rounded-xs px-2 py-0.5 text-[13px]",
                  n.kind === "you" && "bg-primary-tint font-medium text-primary",
                  n.kind === "tracked" && "bg-muted text-foreground",
                  n.kind === "other" && "border border-border text-muted-foreground",
                )}
              >
                {n.kind === "you" ? `${n.name} (you)` : n.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3.5 text-sm leading-relaxed wrap-break-word">
        {answerBlocks(a.text).map((b, i) =>
          b.kind === "p" ? (
            <p key={i}>
              <Marked parts={markNames(b.text, businessName, others)} />
            </p>
          ) : (
            <ListTag key={i} ordered={b.ordered}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <Marked parts={markNames(item, businessName, others)} />
                </li>
              ))}
            </ListTag>
          ),
        )}
      </div>

      {a.sites.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Websites it used</p>
          <ul className="flex flex-wrap gap-1.5" data-testid="answer-sites">
            {a.sites.map((site) => (
              <li key={site.host}>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 rounded-xs border border-border px-2 py-0.5 text-[13px] text-foreground hover:border-primary/40 hover:text-primary"
                >
                  {site.host}
                  <ExternalLink className="size-3 text-text-hint" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ListTag({ ordered, children }: { ordered: boolean; children: React.ReactNode }) {
  const className = cn("flex flex-col gap-1.5 pl-5 marker:text-text-hint", ordered ? "list-decimal" : "list-disc");
  return ordered ? <ol className={className}>{children}</ol> : <ul className={className}>{children}</ul>;
}

function Marked({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.mark === "you" ? (
          <mark key={i} className="rounded-xs bg-primary-tint px-0.5 font-semibold text-primary">
            {p.text}
          </mark>
        ) : p.mark === "other" ? (
          <strong key={i} className="font-semibold">
            {p.text}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
