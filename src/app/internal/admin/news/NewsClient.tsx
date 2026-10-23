"use client";

import { useState, useRef, useCallback } from "react";
import { AlertTriangle, Loader2, Newspaper, Search } from "lucide-react";
import type { NewsStory } from "@/app/api/internal/admin/news/search/route";
import type { GeneratedArticle } from "@/app/api/internal/admin/news/article/route";
import { Button } from "@/components/ui/button";
import { appFetch } from "@/lib/session-expired";
import AdminEmpty from "../_components/admin-empty";
import FilterTabs, { replaceQuery } from "../_components/filter-tabs";
import AdminPageHeader from "../_components/page-header";
import { PERIOD_OPTIONS, WEEKDAYS, getTodayWeekday, type Period, type Weekday } from "./_components/news-config";
import { OutputPanel } from "./_components/output-panel";
import { StoryCard } from "./_components/story-card";
import { WeekdayCards } from "./_components/weekday-cards";

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md bg-low-bg px-4 py-3 text-low-text">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-[14px] font-medium">{message}</p>
    </div>
  );
}

export default function NewsClient({ initialPeriod }: { initialPeriod: Period }) {
  const [weekday, setWeekday] = useState<Weekday>(getTodayWeekday);
  const [todayKey] = useState<Weekday>(getTodayWeekday);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [stories, setStories] = useState<NewsStory[]>([]);

  const [writingId, setWritingId] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [articleWeekday, setArticleWeekday] = useState<Weekday>("monday");

  const outputRef = useRef<HTMLDivElement>(null);

  const clearResults = useCallback(() => {
    setStories([]);
    setArticle(null);
    setSearchError(null);
    setWriteError(null);
  }, []);

  function handleWeekdayChange(w: Weekday) {
    if (searching || !!writingId) return;
    setWeekday(w);
    clearResults();
  }

  function handlePeriodChange(p: Period) {
    if (searching || !!writingId) return;
    setPeriod(p);
    replaceQuery("period", p === "24h" ? null : p);
    clearResults();
  }

  async function handleSearch() {
    if (searching) return;
    setSearching(true);
    setSearchError(null);
    setStories([]);
    setArticle(null);
    setWriteError(null);

    try {
      const res = await appFetch("/api/internal/admin/news/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, weekday }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setStories(data.stories ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleWritePost(story: NewsStory) {
    if (writingId) return;
    setWritingId(String(story.rank));
    setWriteError(null);
    setArticle(null);
    setArticleWeekday(weekday);

    try {
      const res = await appFetch("/api/internal/admin/news/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: story.headline,
          whatIsNew: story.whatIsNew,
          whatItHelpsDo: story.whatItHelpsDo,
          businessOpportunity: story.businessOpportunity,
          howToTryIt: story.howToTryIt,
          sourceUrl: story.sourceUrl,
          sourceName: story.sourceName,
          category: story.category,
          bestFor: story.bestFor,
          weekday,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setArticle(data.article);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setWritingId(null);
    }
  }

  const isBusy = searching || !!writingId;
  const theme = WEEKDAYS.find((w) => w.key === weekday)?.theme;
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="LinkedIn studio"
        subtitle="Turn AI search news into LinkedIn posts that help agencies win and serve clients."
      />

      <WeekdayCards selected={weekday} today={todayKey} onChange={handleWeekdayChange} disabled={isBusy} />

      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs
          label="Time range"
          active={period}
          disabled={isBusy}
          onSelect={(key) => handlePeriodChange(key as Period)}
          tabs={PERIOD_OPTIONS.map((opt) => ({
            key: opt.value,
            label: opt.label,
            href: opt.value === "24h" ? "/internal/admin/news" : `/internal/admin/news?period=${opt.value}`,
          }))}
        />

        <Button type="button" onClick={handleSearch} disabled={isBusy}>
          {searching ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          {searching ? "Searching…" : "Find agency news"}
        </Button>

        {!searching && (
          <span className="text-[13px] text-muted-foreground">
            {theme}, {periodLabel}
          </span>
        )}
      </div>

      {searching && (
        <div
          role="status"
          className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-12 text-center"
        >
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          <p className="text-[15px] font-semibold">Finding stories for {theme}…</p>
          <p className="text-[13px] text-muted-foreground">
            Searching for agency-relevant AI stories from the {periodLabel?.toLowerCase()}. Usually takes 15 to 30
            seconds.
          </p>
        </div>
      )}

      {searchError && !searching && <ErrorBox message={searchError} />}

      {!searching && !searchError && stories.length === 0 && (
        <AdminEmpty icon={Newspaper} title="No stories yet">
          Pick a weekday angle above, then Find agency news to see stories for your LinkedIn post.
        </AdminEmpty>
      )}

      {stories.length > 0 && !searching && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-muted-foreground">
              {stories.length} {stories.length === 1 ? "story" : "stories"}: {theme}
            </p>
            {writingId && (
              <p className="animate-pulse text-[13px] font-medium text-primary">
                Researching and writing LinkedIn post…
              </p>
            )}
          </div>

          {writeError && <ErrorBox message={writeError} />}

          {stories.map((story) => (
            <StoryCard
              key={story.rank}
              story={story}
              writingId={writingId}
              weekday={weekday}
              onWritePost={handleWritePost}
            />
          ))}
        </div>
      )}

      {article && (
        <div ref={outputRef}>
          <OutputPanel article={article} weekday={articleWeekday} onClose={() => setArticle(null)} />
        </div>
      )}
    </div>
  );
}
