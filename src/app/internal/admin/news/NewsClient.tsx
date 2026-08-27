"use client";

import { useState, useRef } from "react";
import type { NewsStory } from "@/app/api/internal/admin/news/search/route";
import type { GeneratedArticle } from "@/app/api/internal/admin/news/article/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "24h" | "48h" | "7d";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "AI News":    "bg-[#EFF6FF] text-[#0866F5] border-[#BFDBFE]",
  "New Models": "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  "AI Tools":   "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
  "Business":   "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
  "Research":   "bg-[#EFF6FF] text-[#0369A1] border-[#BAE6FD]",
  "Funding":    "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]",
  "Regulation": "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
  "Safety":     "bg-[#FEF2F2] text-[#9F1239] border-[#FECACA]",
};

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-[#F8FAFD] text-[#6B7280] border-[#E2E8F0]";
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({
  label,
  text,
  className = "",
}: {
  label: string;
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors ${
        copied
          ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
          : "bg-white text-[#374151] border-[#E2E8F0] hover:border-[#0866F5]/40 hover:text-[#0866F5]"
      } ${className}`}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d="M10 3L5 9 2 6l1-1 2 2 4-5 1 1z"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d="M4 2h6v8H4V2zM2 4h1v7h6v1H2V4z"/>
        </svg>
      )}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── Article panel ────────────────────────────────────────────────────────────

function ArticlePanel({
  article,
  onClose,
}: {
  article: GeneratedArticle;
  onClose: () => void;
}) {
  function buildFullArticle() {
    return [
      article.headline,
      article.subheadline,
      "",
      article.articleBody,
      "",
      "## Why This Matters",
      article.whyItMatters,
      "",
      "## Key Takeaways",
      ...article.keyTakeaways.map((t, i) => `${i + 1}. ${t}`),
      "",
      "## Sources",
      article.sources,
    ].join("\n");
  }

  return (
    <div className="mt-6 bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFD]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#0866F5" aria-hidden="true">
              <path d="M1 2h11v1H3v10H1V2zm2 2h11v11H3V4zm2 2v1h7V6H5zm0 3v1h7V9H5zm0 3v1h4v-1H5z"/>
            </svg>
          </div>
          <h2 className="text-[14px] font-bold text-[#111827]">Generated Article</h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${categoryStyle(article.category)}`}>
            {article.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://app.beehiiv.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-[#0866F5] text-white hover:bg-[#0757D4] transition-colors"
          >
            Open Beehiiv
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M7 1h4v4l-1-1-4 4-1-1 4-4-2-2zm-5 2h3v1H3v6h6V7h1v4H2V3z"/>
            </svg>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F1F5F9] transition-colors"
            aria-label="Close article panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* Headline + Subheadline */}
        <div className="border-b border-[#F1F5F9] pb-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-[20px] font-bold text-[#111827] leading-tight flex-1">{article.headline}</h3>
            <CopyButton label="Copy Headline" text={article.headline} />
          </div>
          {article.subheadline && (
            <p className="text-[14px] text-[#6B7280] mt-1">{article.subheadline}</p>
          )}
        </div>

        {/* Beehiiv metadata */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Email Subject Line</p>
              <CopyButton label="Copy Subject" text={article.emailSubject} />
            </div>
            <p className="text-[13px] font-semibold text-[#111827]">{article.emailSubject}</p>
          </div>
          <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Preview Text</p>
              <CopyButton label="Copy Preview" text={article.previewText} />
            </div>
            <p className="text-[13px] text-[#374151]">{article.previewText}</p>
          </div>
        </div>

        {/* Article body */}
        <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Article Body</p>
            <CopyButton label="Copy Article" text={buildFullArticle()} />
          </div>
          <div className="prose prose-sm max-w-none text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap font-[inherit]">
            {article.articleBody}
          </div>
        </div>

        {/* Why It Matters */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#0866F5] uppercase tracking-wider mb-2">Why This Matters</p>
          <p className="text-[13px] text-[#374151] leading-relaxed">{article.whyItMatters}</p>
        </div>

        {/* Key Takeaways */}
        {article.keyTakeaways.length > 0 && (
          <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Three Key Takeaways</p>
            <ol className="flex flex-col gap-2">
              {article.keyTakeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0866F5] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[13px] text-[#374151] leading-relaxed">{t}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Sources */}
        {article.sources && (
          <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Sources</p>
              <CopyButton label="Copy Sources" text={article.sources} />
            </div>
            <p className="text-[12px] text-[#6B7280] whitespace-pre-wrap leading-relaxed">{article.sources}</p>
          </div>
        )}

        {/* Social */}
        <div className="grid sm:grid-cols-2 gap-4">
          {article.linkedinPost && (
            <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">LinkedIn Post</p>
                <CopyButton label="Copy LinkedIn" text={article.linkedinPost} />
              </div>
              <p className="text-[12px] text-[#374151] whitespace-pre-wrap leading-relaxed">{article.linkedinPost}</p>
            </div>
          )}
          {article.instagramCaption && (
            <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Instagram Caption</p>
                <CopyButton label="Copy Instagram" text={article.instagramCaption} />
              </div>
              <p className="text-[12px] text-[#374151] whitespace-pre-wrap leading-relaxed">{article.instagramCaption}</p>
            </div>
          )}
        </div>

        {/* Image prompt */}
        {article.imagePrompt && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">Image Generation Prompt</p>
              <CopyButton label="Copy Image Prompt" text={article.imagePrompt} />
            </div>
            <p className="text-[12px] text-[#374151] italic leading-relaxed">{article.imagePrompt}</p>
          </div>
        )}

        {/* Copy Everything */}
        <div className="border-t border-[#F1F5F9] pt-4">
          <CopyButton
            label="Copy Everything"
            text={[
              `HEADLINE: ${article.headline}`,
              `SUBHEADLINE: ${article.subheadline}`,
              `EMAIL SUBJECT: ${article.emailSubject}`,
              `PREVIEW TEXT: ${article.previewText}`,
              "",
              "ARTICLE:",
              buildFullArticle(),
              "",
              "LINKEDIN POST:",
              article.linkedinPost,
              "",
              "INSTAGRAM CAPTION:",
              article.instagramCaption,
              "",
              "IMAGE PROMPT:",
              article.imagePrompt,
            ].join("\n")}
            className="w-full justify-center py-2.5"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Story card ───────────────────────────────────────────────────────────────

function StoryCard({
  story,
  writingId,
  onWriteArticle,
}: {
  story: NewsStory;
  writingId: string | null;
  onWriteArticle: (story: NewsStory) => void;
}) {
  const isWriting = writingId === String(story.rank);

  return (
    <div
      className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col gap-3"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[11px] font-bold text-[#6B7280] shrink-0">
          {story.rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${categoryStyle(story.category)}`}>
              {story.category}
            </span>
            {story.publishedAt && (
              <span className="text-[10.5px] text-[#9CA3AF]">{formatDate(story.publishedAt)}</span>
            )}
          </div>
          <h3 className="text-[14px] font-bold text-[#111827] leading-snug mb-1">{story.headline}</h3>
          <p className="text-[12.5px] text-[#6B7280] leading-relaxed">{story.summary}</p>
        </div>
      </div>

      {/* Why it matters */}
      {story.whyItMatters && (
        <div className="bg-[#F8FAFD] border border-[#F1F5F9] rounded-xl px-3.5 py-2.5">
          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Why it matters</p>
          <p className="text-[12px] text-[#374151] leading-relaxed">{story.whyItMatters}</p>
        </div>
      )}

      {/* Angle */}
      {story.suggestedAngle && (
        <div className="flex items-start gap-2">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="#0866F5" className="shrink-0 mt-0.5" aria-hidden="true">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10H7V7h2v4zm0-5H7V4h2v2z"/>
          </svg>
          <p className="text-[11.5px] text-[#0866F5] italic leading-relaxed">{story.suggestedAngle}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-[#F8FAFD]">
        <div className="flex items-center gap-1.5">
          {story.sourceName && (
            <span className="text-[11px] text-[#9CA3AF] font-medium">{story.sourceName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {story.sourceUrl && (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] font-semibold text-[#6B7280] hover:text-[#0866F5] border border-[#E2E8F0] hover:border-[#0866F5]/40 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              View Source
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M7 1h4v4l-1-1-4 4-1-1 4-4-2-2zm-5 2h3v1H3v6h6V7h1v4H2V3z"/>
              </svg>
            </a>
          )}
          <button
            type="button"
            disabled={!!writingId}
            onClick={() => onWriteArticle(story)}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold bg-[#0866F5] hover:bg-[#0757D4] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWriting ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin" aria-hidden="true">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Writing…
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M13 1l2 2-9 9H4v-2l9-9zM2 13h12v2H2v-2z"/>
                </svg>
                Write Article
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function NewsClient() {
  const [period,      setPeriod]      = useState<Period>("24h");
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [stories,     setStories]     = useState<NewsStory[]>([]);

  const [writingId,   setWritingId]   = useState<string | null>(null);
  const [writeError,  setWriteError]  = useState<string | null>(null);
  const [article,     setArticle]     = useState<GeneratedArticle | null>(null);

  const articleRef = useRef<HTMLDivElement>(null);

  async function handleSearch() {
    if (searching) return;
    setSearching(true);
    setSearchError(null);
    setStories([]);
    setArticle(null);
    setWriteError(null);

    try {
      const res  = await fetch("/api/internal/admin/news/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
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

  async function handleWriteArticle(story: NewsStory) {
    if (writingId) return;
    setWritingId(String(story.rank));
    setWriteError(null);
    setArticle(null);

    try {
      const res  = await fetch("/api/internal/admin/news/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline:       story.headline,
          summary:        story.summary,
          whyItMatters:   story.whyItMatters,
          sourceUrl:      story.sourceUrl,
          sourceName:     story.sourceName,
          category:       story.category,
          suggestedAngle: story.suggestedAngle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Article generation failed");
      setArticle(data.article);
      // Scroll to article panel
      setTimeout(() => articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : "Article generation failed. Please try again.");
    } finally {
      setWritingId(null);
    }
  }

  const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "48h", label: "Last 48 Hours" },
    { value: "7d",  label: "Last 7 Days" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#0866F5" aria-hidden="true">
                <path d="M1 2h11v1H3v10H1V2zm2 2h11v11H3V4zm2 2v1h7V6H5zm0 3v1h7V9H5zm0 3v1h4v-1H5z"/>
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-[#111827]">AI Newsroom</h1>
          </div>
          <p className="text-[12.5px] text-[#9CA3AF]">
            Find today&apos;s biggest AI stories and turn them into original articles for Customers.Direct AI.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Period filter */}
          <div className="flex items-center bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-1 gap-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                disabled={searching}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors ${
                  period === opt.value
                    ? "bg-white text-[#111827] shadow-sm border border-[#E2E8F0]"
                    : "text-[#9CA3AF] hover:text-[#374151]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center gap-2 bg-[#0866F5] hover:bg-[#0757D4] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {searching ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin" aria-hidden="true">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Searching…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M11.7 10.3l2.9 2.9-1.4 1.4-2.9-2.9A6 6 0 112 7a6 6 0 019.7 3.3zm-1.4.4A4 4 0 107 3a4 4 0 003.3 7.7z"/>
                </svg>
                Find Latest AI News
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {searching && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0866F5" strokeWidth="2.5" className="animate-spin" aria-hidden="true">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-[#111827] mb-1">Searching today&apos;s AI news and verifying sources…</p>
          <p className="text-[12px] text-[#9CA3AF]">This usually takes 15–30 seconds.</p>
        </div>
      )}

      {/* Search error */}
      {searchError && !searching && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-5 py-4 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#DC2626" className="shrink-0 mt-0.5" aria-hidden="true">
            <path d="M8 1L1 13h14L8 1zm0 3l4.5 7.8H3.5L8 4zM7 8v2h2V8H7zm0 3v1h2v-1H7z"/>
          </svg>
          <p className="text-[13px] text-[#991B1B] font-medium">{searchError}</p>
        </div>
      )}

      {/* Empty state */}
      {!searching && !searchError && stories.length === 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="w-12 h-12 rounded-2xl bg-[#F8FAFD] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="#9CA3AF" aria-hidden="true">
              <path d="M1 2h11v1H3v10H1V2zm2 2h11v11H3V4zm2 2v1h7V6H5zm0 3v1h7V9H5zm0 3v1h4v-1H5z"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[#374151] mb-1">No stories yet</p>
          <p className="text-[12px] text-[#9CA3AF]">Click "Find Latest AI News" to search the web for today&apos;s top AI stories.</p>
        </div>
      )}

      {/* Story cards */}
      {stories.length > 0 && !searching && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
              {stories.length} Stories Found
            </p>
            {writingId && (
              <p className="text-[12px] text-[#0866F5] font-medium animate-pulse">
                Researching and writing article…
              </p>
            )}
          </div>

          {writeError && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#DC2626" aria-hidden="true">
                <path d="M8 1L1 13h14L8 1zm0 3l4.5 7.8H3.5L8 4zM7 8v2h2V8H7zm0 3v1h2v-1H7z"/>
              </svg>
              <p className="text-[12.5px] text-[#991B1B] font-medium">{writeError}</p>
            </div>
          )}

          {stories.map((story) => (
            <StoryCard
              key={story.rank}
              story={story}
              writingId={writingId}
              onWriteArticle={handleWriteArticle}
            />
          ))}
        </div>
      )}

      {/* Article panel */}
      {article && (
        <div ref={articleRef}>
          <ArticlePanel
            article={article}
            onClose={() => setArticle(null)}
          />
        </div>
      )}
    </div>
  );
}
