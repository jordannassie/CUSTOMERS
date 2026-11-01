"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import type { QuestionAnswer } from "@/modules/questions/answers";
import { namedBusinesses } from "@/modules/questions/answer-parse";
import { whySkipped } from "@/modules/questions/skipped";
import { SiteIcon } from "@/components/app/SiteIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocalDate } from "@/components/ui/local-date";
import { AnswerText } from "./AnswerText";
import { useQuestions } from "./QuestionsProvider";
import { SkippedFix } from "./SkippedFix";

const DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };

/**
 * One AI's latest answer in the details pane (mockup-ui, PromptWatch's "Response details"): its facts in a strip, then
 * who it named, the full text, the sites it used, and why you were left out. Numbered by where AI listed each business
 * only with SHOW_POSITION (D-63).
 */
export function AnswerPanel({ answer: a, businessName, when = "Latest answer" }: { answer: QuestionAnswer; businessName: string; when?: string }) {
  const { showPositions } = useQuestions().view;
  const List = showPositions ? "ol" : "ul";
  const [full, setFull] = useState(false);
  const others = [...a.competitors, ...a.others];
  const names = { you: businessName, others };
  const list = namedBusinesses(a.text, businessName, others);
  const count = others.length + (a.namedYou ? 1 : 0);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="inline-flex items-center gap-2 text-[14.5px] font-semibold tracking-[-0.01em]">
          <span className={cn("size-2 rounded-full", DOT[a.model])} aria-hidden="true" />
          {a.label} answer
          <span className="text-xs font-normal text-muted-foreground">{when}</span>
        </p>
        {a.reused && (
          <Badge variant="outline" title="This answer was reused from an earlier check of the same question in the last 20 hours.">
            Reused answer
          </Badge>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border px-4 py-3 sm:grid-cols-4">
        <Fact label="Named you">
          <Badge variant={a.namedYou ? "good" : "secondary"}>{a.namedYou ? "Named you" : "Did not name you"}</Badge>
        </Fact>
        <Fact label="AI">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className={cn("size-2 rounded-full", DOT[a.model])} aria-hidden="true" />
            {a.label}
          </span>
        </Fact>
        <Fact label="Businesses named">{a.namesChecked ? count : "Couldn't read"}</Fact>
        <Fact label="Checked">
          <LocalDate iso={a.checkedAt} options={DATE} />
        </Fact>
      </dl>

      <div className="flex flex-col gap-4 px-4 py-4">
        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Response</p>
          {list.length > 0 ? (
            <List className="flex flex-col gap-1.5" data-testid="answer-named" aria-label="Businesses in this answer">
              {list.map((b, i) => (
                <li
                  key={b.name}
                  className={cn("flex gap-2.5 rounded-md border px-3 py-2", b.you ? "border-primary/25 bg-primary-tint" : "border-border bg-surface")}
                  data-you={b.you || undefined}
                >
                  {showPositions && (
                    <span className={cn("w-4 shrink-0 text-[13px] font-semibold tabular-nums", b.you ? "text-primary" : "text-text-hint")}>{i + 1}</span>
                  )}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn("text-[13px] font-semibold", b.you && "text-primary")}>
                      {b.name}
                      {b.you && " (you)"}
                    </span>
                    {b.line && <span className="text-xs leading-relaxed text-muted-foreground wrap-break-word">{b.line}</span>}
                  </span>
                </li>
              ))}
            </List>
          ) : (
            <div className="rounded-lg bg-muted/60 px-3.5 py-3">
              <AnswerText text={a.text} names={names} />
            </div>
          )}
          {list.length > 0 && (
            <>
              <Button type="button" variant="link" size="sm" className="h-auto w-fit gap-1 p-0 text-xs" aria-expanded={full} onClick={() => setFull((v) => !v)}>
                <ChevronDown className={cn("size-3.5 transition-transform duration-150", full && "rotate-180")} aria-hidden="true" />
                {full ? "Hide full answer text" : "Show full answer text"}
              </Button>
              {full && (
                <div className="rounded-lg bg-muted/60 px-3.5 py-3">
                  <AnswerText text={a.text} names={names} />
                </div>
              )}
            </>
          )}
        </section>

        {a.sites.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Websites it used ({a.sites.length})</p>
            <ul className="flex flex-wrap gap-1.5" data-testid="answer-sites">
              {a.sites.map((site) => (
                <li key={site.host}>
                  <Link
                    href="/sources"
                    title={`See ${site.host} on Sources`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pr-2.5 pl-0.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
                  >
                    <SiteIcon domain={site.host} name={site.host} size="sm" className="size-6" />
                    {site.host}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!a.namedYou && (
          <div className="flex flex-col gap-3 rounded-lg border border-border border-l-2 border-l-mid bg-surface px-3.5 py-3" data-testid="why-skipped">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-mid-text">Why you were skipped</p>
              <p className="text-[13px] leading-relaxed text-foreground">{whySkipped(a)}</p>
            </div>
            <SkippedFix answer={a} />
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[11px] font-medium tracking-[0.04em] text-text-hint uppercase">{label}</dt>
      <dd className="text-[13px] tabular-nums">{children}</dd>
    </div>
  );
}
