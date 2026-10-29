"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "cn";
import { questionsHref } from "@/lib/questions-href";
import { FILTER_LABELS, filterCounts, LIST_FILTERS, topicsOf, type ListFilter } from "@/modules/questions/list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useQuestions } from "./QuestionsProvider";

/** All, Named you, Never named, Getting worse; the topic chips in use; and the chip of a link that narrowed the list. */

const AI_LABELS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
export function QuestionFilters() {
  const { view, focus, filter, setFilter, topic, setTopic, showPaused } = useQuestions();
  const rows = [...view.active, ...(showPaused ? view.paused : [])].filter((r) => r.matches);
  const counts = filterCounts(rows, topic);
  const topics = topicsOf([...view.active, ...view.paused]);

  return (
    <div className="flex flex-col gap-3" data-testid="question-filters">
      {(focus.site || focus.named) && (
        <div className="flex flex-wrap gap-2">
          {focus.site && (
            <LinkChip href={questionsHref({ named: focus.named, ai: focus.ai })} label={`Answers that used ${focus.site}`} testId="site-filter" />
          )}
          {focus.named && (
            <LinkChip href={questionsHref({ site: focus.site, ai: focus.ai })} label={`${focus.named} named, not you`} testId="named-filter" />
          )}
          {focus.ai && (
            <LinkChip href={questionsHref({ site: focus.site, named: focus.named })} label={`From ${AI_LABELS[focus.ai] ?? focus.ai}`} testId="ai-filter" />
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          aria-label="Show questions"
          value={filter}
          onValueChange={(v) => setFilter(v as ListFilter)}
          options={LIST_FILTERS.map((f) => ({ value: f, label: `${FILTER_LABELS[f]} (${counts[f]})` }))}
          className="max-w-full flex-wrap"
        />
        {topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Topic">
            <span className="text-xs text-muted-foreground">Topic</span>
            {topics.map((t) => {
              const on = topic !== null && t.toLowerCase() === topic.toLowerCase();
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTopic(on ? null : t)}
                  className={cn(
                    "h-8 rounded-sm border px-2.5 text-[13px] transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on ? "border-primary bg-primary-tint text-primary" : "border-border bg-surface text-foreground hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** A removable chip: the link drops this one filter and keeps the other. */
function LinkChip({ href, label, testId }: { href: string; label: string; testId: string }) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-primary/30 bg-primary-tint px-2.5 text-[13px] text-primary hover:border-primary"
    >
      {label}
      <X className="size-3.5" aria-hidden="true" />
      <span className="sr-only">(remove this filter)</span>
    </Link>
  );
}
