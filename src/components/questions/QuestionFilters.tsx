"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "cn";
import { questionsHref } from "@/lib/questions-href";
import { FILTER_LABELS, filterCounts, LIST_FILTERS, topicsOf, type ListFilter } from "@/modules/questions/list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useQuestions } from "./QuestionsProvider";

const AI_LABELS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
/**
 * The list's toolbar: All, Named you, Never named, Getting worse; a box to filter by words; the topic chips in use;
 * and the chip of a link that narrowed the list.
 */
export function QuestionFilters() {
  const { view, focus, filter, setFilter, topic, setTopic, query, setQuery, showPaused } = useQuestions();
  const rows = [...view.active, ...(showPaused ? view.paused : [])].filter((r) => r.matches);
  const counts = filterCounts(rows, topic);
  const topics = topicsOf([...view.active, ...view.paused]);

  return (
    <div className="flex flex-col gap-2.5 border-b border-border px-4 py-2.5" data-testid="question-filters">
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
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <SegmentedControl
            aria-label="Show questions"
            value={filter}
            onValueChange={(v) => setFilter(v as ListFilter)}
            options={LIST_FILTERS.map((f) => ({ value: f, label: `${FILTER_LABELS[f]} (${counts[f]})` }))}
            className="max-w-full flex-wrap p-0.5"
          />
          <label className="flex h-8 w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:w-60">
            <Search className="size-3.5 shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by question"
              aria-label="Filter questions by words"
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-text-hint"
            />
          </label>
        </div>
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
                    "h-7 rounded-sm border px-2 text-xs font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on ? "border-primary/40 bg-primary-tint text-primary" : "border-border bg-surface text-foreground hover:bg-muted",
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
      className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-primary/30 bg-primary-tint px-2 text-xs font-medium text-primary hover:border-primary"
    >
      {label}
      <X className="size-3.5" aria-hidden="true" />
      <span className="sr-only">(remove this filter)</span>
    </Link>
  );
}
