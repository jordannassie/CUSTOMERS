import { ExternalLink, Loader2, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import type { NewsStory } from "@/app/api/internal/admin/news/search/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WEEKDAYS, categoryTone, formatDate, type Weekday } from "./news-config";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold text-muted-foreground">{label}</p>
      <p className="text-[14px] leading-relaxed">{children}</p>
    </div>
  );
}

export function StoryCard({ story, writingId, weekday, onWritePost }: {
  story: NewsStory;
  writingId: string | null;
  weekday: Weekday;
  onWritePost: (story: NewsStory) => void;
}) {
  const isWriting = writingId === String(story.rank);
  const pubDate = formatDate(story.publishedAt);
  const weekdayDef = WEEKDAYS.find((w) => w.key === weekday);

  return (
    <article className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted text-[12px] font-semibold text-muted-foreground">
          {story.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={categoryTone(story.category)}>{story.category}</Badge>
            {pubDate && <span className="text-[12px] text-muted-foreground">{pubDate}</span>}
          </div>
          <h3 className="text-[15px] font-semibold leading-snug">{story.headline}</h3>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {story.whatIsNew && <Field label="What changed">{story.whatIsNew}</Field>}

        {story.whatItHelpsDo && (
          <div className="rounded-md border border-primary bg-primary-tint px-4 py-3">
            <p className="mb-1 text-[12px] font-semibold text-primary-hover">Why agencies should care</p>
            <p className="text-[14px] font-medium leading-snug">{story.whatItHelpsDo}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {story.bestFor && (
            <div className="rounded-md border border-border bg-muted px-4 py-3">
              <Field label="What it means for clients">{story.bestFor}</Field>
            </div>
          )}
          {story.businessOpportunity && (
            <div className="rounded-md border border-border bg-muted px-4 py-3">
              <Field label={weekdayDef ? `${weekdayDef.theme} angle` : "Suggested post angle"}>
                {story.businessOpportunity}
              </Field>
            </div>
          )}
        </div>

        {story.howToTryIt && <Field label="Practical first step">{story.howToTryIt}</Field>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <span className="text-[12px] font-medium text-muted-foreground">{story.sourceName}</span>
        <div className="flex flex-wrap items-center gap-2">
          {story.sourceUrl && (
            <Button asChild variant="outline" className="text-[13px]">
              <a href={story.sourceUrl} target="_blank" rel="noreferrer">
                View source
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          )}
          <Button type="button" disabled={!!writingId} onClick={() => onWritePost(story)} className="text-[13px]">
            {isWriting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Pencil aria-hidden="true" />}
            {isWriting ? "Writing…" : "Write LinkedIn post"}
          </Button>
        </div>
      </div>
    </article>
  );
}
