"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import type { GeneratedArticle } from "@/app/api/internal/admin/news/article/route";
import { CopyButton } from "./copy-button";
import { SectionLetter } from "./section-parts";

function Block({ title, action, tone, children }: {
  title: string;
  action?: ReactNode;
  tone?: "tint";
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-md border p-4", tone === "tint" ? "border-primary bg-primary-tint" : "border-border bg-muted")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-muted-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function buildNewsletter(article: GeneratedArticle) {
  return [
    article.headline,
    article.subheadline,
    "",
    article.articleBody,
    "",
    "## Why this matters",
    article.whyItMatters,
    "",
    "## Key takeaways",
    ...article.keyTakeaways.map((t, i) => `${i + 1}. ${t}`),
    "",
    "## Sources",
    article.sources,
  ].join("\n");
}

export function NewsletterBriefing({ article }: { article: GeneratedArticle }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="newsletter-briefing"
        className="flex min-h-9 w-full items-center justify-between gap-2 bg-muted px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex flex-wrap items-center gap-2">
          <SectionLetter letter="E" />
          <span className="text-[14px] font-semibold">Optional newsletter briefing</span>
          <span className="text-[12px] text-muted-foreground">(email subject, article body, key takeaways)</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id="newsletter-briefing" className="flex flex-col gap-4 p-4">
          <div className="border-b border-border pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="min-w-0 flex-1 text-[18px] font-semibold leading-tight">{article.headline}</h3>
              <CopyButton label="Copy headline" text={article.headline} />
            </div>
            {article.subheadline && <p className="mt-1 text-[14px] text-muted-foreground">{article.subheadline}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {article.emailSubject && (
              <Block title="Email subject" action={<CopyButton label="Copy" text={article.emailSubject} />}>
                <p className="text-[14px] font-medium">{article.emailSubject}</p>
              </Block>
            )}
            {article.previewText && (
              <Block title="Preview text" action={<CopyButton label="Copy" text={article.previewText} />}>
                <p className="text-[14px]">{article.previewText}</p>
              </Block>
            )}
          </div>

          {article.articleBody && (
            <Block title="Article body" action={<CopyButton label="Copy article" text={buildNewsletter(article)} />}>
              <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{article.articleBody}</div>
            </Block>
          )}

          {article.whyItMatters && (
            <Block title="Why this matters" tone="tint">
              <p className="text-[14px] leading-relaxed">{article.whyItMatters}</p>
            </Block>
          )}

          {article.keyTakeaways.length > 0 && (
            <Block title="Key takeaways">
              <ol className="flex flex-col gap-2">
                {article.keyTakeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary text-[12px] font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="text-[14px] leading-relaxed">{t}</p>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {article.instagramCaption && (
            <Block title="Instagram caption" action={<CopyButton label="Copy Instagram" text={article.instagramCaption} />}>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{article.instagramCaption}</p>
            </Block>
          )}
        </div>
      )}
    </section>
  );
}
