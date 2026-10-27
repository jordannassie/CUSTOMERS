"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "cn";
import type { QuestionAnswer } from "@/modules/questions/answers";
import { namedBusinesses } from "@/modules/questions/answer-parse";
import { whySkipped } from "@/modules/questions/skipped";
import { fixHref } from "@/lib/fix-where";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocalDate } from "@/components/ui/local-date";
import { AnswerText } from "./AnswerText";

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** One AI's latest answer: who it named in its order, the sites it used, and why you were left out. */
export function AnswerPanel({ answer: a, businessName }: { answer: QuestionAnswer; businessName: string }) {
  const [full, setFull] = useState(false);
  const others = [...a.competitors, ...a.others];
  const names = { you: businessName, others };
  const list = namedBusinesses(a.text, businessName, others);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <Badge variant={a.namedYou ? "good" : "secondary"}>{a.namedYou ? "Named you" : "Did not name you"}</Badge>
        <span className="text-muted-foreground">
          Latest answer, <LocalDate iso={a.checkedAt} options={SHORT} />
        </span>
        {a.reused && (
          <Badge variant="outline" title="This answer was reused from an earlier check of the same question in the last 20 hours.">
            Reused answer
          </Badge>
        )}
      </div>

      {list.length > 0 ? (
        <ol className="flex flex-col gap-2" data-testid="answer-named" aria-label="Businesses in this answer">
          {list.map((b, i) => (
            <li
              key={b.name}
              className={cn("flex gap-3 rounded-sm border px-3 py-2", b.you ? "border-primary/30 bg-primary-tint" : "border-border bg-surface")}
              data-you={b.you || undefined}
            >
              <span className={cn("w-4 shrink-0 text-sm font-semibold tabular-nums", b.you ? "text-primary" : "text-text-hint")}>{i + 1}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn("text-sm font-semibold", b.you && "text-primary")}>
                  {b.name}
                  {b.you && " (you)"}
                </span>
                {b.line && <span className="text-[13px] text-muted-foreground wrap-break-word">{b.line}</span>}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-md border border-border bg-background px-4 py-3.5">
          <AnswerText text={a.text} names={names} />
        </div>
      )}

      {a.sites.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Websites it used</p>
          <ul className="flex flex-wrap gap-1.5" data-testid="answer-sites">
            {a.sites.map((site) => (
              <li key={site.host}>
                <Link
                  href="/sources"
                  title={`See ${site.host} on Sources`}
                  className="inline-flex items-center rounded-xs bg-muted px-2 py-0.5 text-[13px] text-foreground hover:bg-primary-tint hover:text-primary"
                >
                  {site.host}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {list.length > 0 && (
        <div className="flex flex-col gap-3">
          <Button type="button" variant="link" size="sm" className="h-auto w-fit gap-1 p-0 text-[13px]" aria-expanded={full} onClick={() => setFull((v) => !v)}>
            <ChevronDown className={cn("size-3.5 transition-transform duration-150", full && "rotate-180")} aria-hidden="true" />
            {full ? "Hide full answer text" : "Show full answer text"}
          </Button>
          {full && (
            <div className="rounded-md border border-border bg-background px-4 py-3.5">
              <AnswerText text={a.text} names={names} />
            </div>
          )}
        </div>
      )}

      {!a.namedYou && (
        <div className="flex flex-col gap-2 rounded-md border border-mid/30 bg-mid-bg px-4 py-3" data-testid="why-skipped">
          <p className="text-xs font-semibold text-mid-text">Why you were skipped</p>
          <p className="text-[13px] text-foreground">{whySkipped(a)}</p>
          <Link href={a.fix ? fixHref(a.fix.id) : "/actions"} className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            {a.fix ? `Open the fix for ${a.fix.host}` : "See what to fix in Actions"}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
