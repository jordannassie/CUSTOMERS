import { X } from "lucide-react";
import type { GeneratedArticle } from "@/app/api/internal/admin/news/article/route";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { AEO_REPLY, WEEKDAYS, type Weekday } from "./news-config";
import { NewsletterBriefing } from "./newsletter-briefing";
import { LinkedInPostEditor } from "./post-editor";
import { PanelSection } from "./section-parts";

export function OutputPanel({ article, weekday, onClose }: {
  article: GeneratedArticle;
  weekday: Weekday;
  onClose: () => void;
}) {
  const weekdayDef = WEEKDAYS.find((w) => w.key === weekday);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3 sm:px-6">
        <div>
          <h2 className="text-[15px] font-semibold">LinkedIn post ready</h2>
          {weekdayDef && <p className="text-[12px] text-muted-foreground">{weekdayDef.label}, {weekdayDef.theme}</p>}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close output panel">
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <PanelSection letter="A" title="LinkedIn post">
          {/* The key resets the editor when a new article's post arrives. */}
          <LinkedInPostEditor key={article.linkedinPost} initialPost={article.linkedinPost} />
        </PanelSection>

        {article.imagePrompt && (
          <PanelSection
            letter="B"
            title="Image prompt for GPT"
            action={<CopyButton label="Copy image prompt" text={article.imagePrompt} />}
            note="Paste this into ChatGPT or Midjourney to generate a 1080×1080 LinkedIn image."
          >
            <p className="whitespace-pre-wrap text-[14px] italic leading-relaxed">{article.imagePrompt}</p>
          </PanelSection>
        )}

        {article.sources && (
          <PanelSection
            letter="C"
            title="Sources"
            action={<CopyButton label="Copy sources" text={article.sources} />}
            note="Keep sources separate from the post. Review to confirm verified facts vs. interpretation."
          >
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{article.sources}</p>
          </PanelSection>
        )}

        <PanelSection
          letter="D"
          title="Reply to AEO comments"
          action={<CopyButton label="Copy reply + link" text={AEO_REPLY} />}
          note={<>Send this manually to anyone who comments &ldquo;AEO&rdquo; on your post.</>}
        >
          <p className="whitespace-pre-wrap text-[14px] font-medium leading-relaxed">{AEO_REPLY}</p>
        </PanelSection>

        <NewsletterBriefing article={article} />
      </div>
    </div>
  );
}
