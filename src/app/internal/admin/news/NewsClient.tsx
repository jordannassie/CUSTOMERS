"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { NewsStory } from "@/app/api/internal/admin/news/search/route";
import type { GeneratedArticle } from "@/app/api/internal/admin/news/article/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period  = "24h" | "48h" | "7d";
type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

// ─── Weekday config ───────────────────────────────────────────────────────────

interface WeekdayDef {
  key:   Weekday;
  short: string;
  label: string;
  theme: string;
  desc:  string;
}

const WEEKDAYS: WeekdayDef[] = [
  {
    key: "monday", short: "Mon", label: "Monday",
    theme: "AI Search News",
    desc:  "Explain a verified AI search development and what it means for agency clients.",
  },
  {
    key: "tuesday", short: "Tue", label: "Tuesday",
    theme: "Client vs. Competitors",
    desc:  "Explain how agencies can compare client visibility against competitors.",
  },
  {
    key: "wednesday", short: "Wed", label: "Wednesday",
    theme: "Package AEO Services",
    desc:  "Help agencies explain, scope, and offer AEO services to clients.",
  },
  {
    key: "thursday", short: "Thu", label: "Thursday",
    theme: "Reporting Checklist",
    desc:  "Share practical AI visibility audit steps and client-reporting advice.",
  },
  {
    key: "friday", short: "Fri", label: "Friday",
    theme: "Agency Workflow",
    desc:  "Show how agencies can use Customers.Direct features for client comparisons and next steps.",
  },
];

function getTodayWeekday(): Weekday {
  const day = new Date().getDay(); // 0=Sun … 6=Sat
  const map: Record<number, Weekday> = {
    0: "monday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "monday",
  };
  return map[day];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LINKEDIN_LIMIT = 3000;

const CATEGORY_COLORS: Record<string, string> = {
  "AI Search":             "bg-[#EFF6FF] text-[#0866F5] border-[#BFDBFE]",
  "AEO":                   "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  "Brand Visibility":      "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
  "Competitor Intelligence":"bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]",
  "Client Reporting":      "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
  "Agency Tools":          "bg-[#EFF6FF] text-[#0369A1] border-[#BAE6FD]",
  "Platform Update":       "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
  "AI Content":            "bg-[#F8FAFD] text-[#374151] border-[#E2E8F0]",
  // Legacy categories from old prompt
  "AI Tools":              "bg-[#EFF6FF] text-[#0866F5] border-[#BFDBFE]",
  "AI Marketing":          "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  "New Features":          "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
};

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-[#F8FAFD] text-[#6B7280] border-[#E2E8F0]";
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return null; }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCopy({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M4 2h6v8H4V2zM2 4h1v7h6v1H2V4z"/>
    </svg>
  );
}
function IconCheck({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M10 3L5 9 2 6l1-1 2 2 4-5 1 1z"/>
    </svg>
  );
}
function IconSpin({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
function IconX({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconExternalLink({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M7 1h4v4l-1-1-4 4-1-1 4-4-2-2zm-5 2h3v1H3v6h6V7h1v4H2V3z"/>
    </svg>
  );
}
function IconPencil({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13 1l2 2-9 9H4v-2l9-9zM2 13h12v2H2v-2z"/>
    </svg>
  );
}

// ─── CopyButton (copies static text) ─────────────────────────────────────────

function CopyButton({
  label, text, className = "",
}: { label: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed — please select and copy the text manually.");
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
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── CopyButtonFn (copies from a function — for edited text) ─────────────────

function CopyButtonFn({
  label, getText, className = "",
}: { label: string; getText: () => string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed — please select and copy the text manually.");
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
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── WeekdayCards ─────────────────────────────────────────────────────────────

function WeekdayCards({
  selected, today, onChange, disabled,
}: {
  selected: Weekday;
  today:    Weekday;
  onChange: (w: Weekday) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 mb-7">
      {WEEKDAYS.map((w) => {
        const isSelected = w.key === selected;
        const isToday    = w.key === today;
        return (
          <button
            key={w.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(w.key)}
            className={`relative flex flex-col items-center text-center px-2 py-3 rounded-2xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? "bg-[#0866F5] border-[#0866F5] text-white shadow-md"
                : "bg-white border-[#E2E8F0] text-[#374151] hover:border-[#0866F5]/40 hover:bg-[#F8FAFD]"
            }`}
            aria-pressed={isSelected}
          >
            {isToday && (
              <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                isSelected ? "bg-white text-[#0866F5]" : "bg-[#0866F5] text-white"
              }`}>
                Today
              </span>
            )}
            <span className={`text-[11px] font-bold mb-1 ${isSelected ? "text-white/70" : "text-[#9CA3AF]"}`}>
              {w.short}
            </span>
            <span className={`text-[12px] font-bold leading-tight mb-1.5 ${isSelected ? "text-white" : "text-[#111827]"}`}>
              {w.theme}
            </span>
            <span className={`text-[10px] leading-snug hidden sm:block ${isSelected ? "text-white/70" : "text-[#9CA3AF]"}`}>
              {w.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── LinkedInPostEditor ───────────────────────────────────────────────────────

function LinkedInPostEditor({ initialPost }: { initialPost: string }) {
  const [text, setText] = useState(initialPost);
  const charCount       = text.length;
  const isOver          = charCount > LINKEDIN_LIMIT;

  useEffect(() => { setText(initialPost); }, [initialPost]);

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold tabular-nums ${isOver ? "text-[#DC2626]" : "text-[#9CA3AF]"}`}>
            {charCount.toLocaleString()} / {LINKEDIN_LIMIT.toLocaleString()} characters
          </span>
          {isOver && (
            <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-full">
              Over LinkedIn limit — trim before posting
            </span>
          )}
        </div>
        <CopyButtonFn label="Copy LinkedIn Post" getText={() => text} />
      </div>

      {/* Editable textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className={`w-full px-4 py-3.5 text-[13px] text-[#111827] leading-relaxed border rounded-xl resize-y font-[inherit] bg-white focus:outline-none focus:ring-2 focus:ring-[#0866F5]/20 transition-colors ${
          isOver ? "border-[#FCA5A5]" : "border-[#E2E8F0] focus:border-[#0866F5]/40"
        }`}
        aria-label="Editable LinkedIn post"
      />

      {/* Review reminder */}
      <p className="text-[11px] text-[#9CA3AF] italic">
        Review all facts and source attributions before posting. AI-generated content may contain errors.
      </p>
    </div>
  );
}

// ─── OutputPanel ──────────────────────────────────────────────────────────────

const AEO_REPLY = `Thanks for commenting AEO! Here's the link: https://customers.direct/

Enter your client's website and a competitor's website to compare their AI search visibility. Which client are you checking first?`;

function OutputPanel({
  article,
  weekday,
  onClose,
}: {
  article: GeneratedArticle;
  weekday: Weekday;
  onClose: () => void;
}) {
  const weekdayDef = WEEKDAYS.find((w) => w.key === weekday);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  function buildNewsletter() {
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
    <div
      className="mt-6 bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFD]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
            <IconPencil size={13} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-[#111827]">LinkedIn Post Ready</h2>
            {weekdayDef && (
              <p className="text-[11px] text-[#9CA3AF]">{weekdayDef.label} · {weekdayDef.theme}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F1F5F9] transition-colors"
          aria-label="Close output panel"
        >
          <IconX />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* A — LinkedIn Post */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#0866F5] text-white text-[9px] font-bold flex items-center justify-center shrink-0">A</span>
            <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-wider">LinkedIn Post</h3>
          </div>
          <LinkedInPostEditor initialPost={article.linkedinPost} />
        </section>

        {/* B — Image Prompt */}
        {article.imagePrompt && (
          <section className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#D97706] text-white text-[9px] font-bold flex items-center justify-center shrink-0">B</span>
                <h3 className="text-[13px] font-bold text-[#92400E] uppercase tracking-wider">Image Prompt for GPT</h3>
              </div>
              <CopyButton label="Copy Image Prompt" text={article.imagePrompt} />
            </div>
            <p className="text-[11px] text-[#92400E] mb-2.5">
              Paste this into ChatGPT or Midjourney to generate a 1080×1080 LinkedIn image.
            </p>
            <p className="text-[12.5px] text-[#374151] italic leading-relaxed whitespace-pre-wrap">
              {article.imagePrompt}
            </p>
          </section>
        )}

        {/* C — Sources */}
        {article.sources && (
          <section className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#374151] text-white text-[9px] font-bold flex items-center justify-center shrink-0">C</span>
                <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wider">Sources</h3>
              </div>
              <CopyButton label="Copy Sources" text={article.sources} />
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-2.5">
              Keep sources separate from the post. Review to confirm verified facts vs. interpretation.
            </p>
            <p className="text-[12px] text-[#374151] whitespace-pre-wrap leading-relaxed">
              {article.sources}
            </p>
          </section>
        )}

        {/* D — Reply to AEO Comments */}
        <section className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15803D] text-white text-[9px] font-bold flex items-center justify-center shrink-0">D</span>
              <h3 className="text-[13px] font-bold text-[#166534] uppercase tracking-wider">Reply to AEO Comments</h3>
            </div>
            <CopyButton label="Copy Reply + Link" text={AEO_REPLY} />
          </div>
          <p className="text-[11px] text-[#166534] mb-2.5">
            Send this manually to anyone who comments "AEO" on your post.
          </p>
          <p className="text-[12.5px] text-[#166534] whitespace-pre-wrap leading-relaxed font-medium">
            {AEO_REPLY}
          </p>
        </section>

        {/* E — Newsletter Briefing (collapsed) */}
        <details
          open={newsletterOpen}
          onToggle={(e) => setNewsletterOpen((e.target as HTMLDetailsElement).open)}
          className="border border-[#E2E8F0] rounded-xl overflow-hidden"
        >
          <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer bg-[#F8FAFD] hover:bg-[#F1F5F9] transition-colors select-none list-none">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#9CA3AF] text-white text-[9px] font-bold flex items-center justify-center shrink-0">E</span>
              <span className="text-[12.5px] font-bold text-[#374151]">Optional Newsletter Briefing</span>
              <span className="text-[10px] text-[#9CA3AF] font-medium">(email subject, article body, key takeaways)</span>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="#9CA3AF"
              className={`transition-transform shrink-0 ${newsletterOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M2 5l5 5 5-5H2z"/>
            </svg>
          </summary>

          <div className="p-5 flex flex-col gap-4">
            {/* Headline */}
            <div className="border-b border-[#F1F5F9] pb-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-[16px] font-bold text-[#111827] leading-tight flex-1">{article.headline}</h3>
                <CopyButton label="Copy Headline" text={article.headline} />
              </div>
              {article.subheadline && (
                <p className="text-[13px] text-[#6B7280] mt-1">{article.subheadline}</p>
              )}
            </div>

            {/* Email metadata */}
            <div className="grid sm:grid-cols-2 gap-3">
              {article.emailSubject && (
                <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider">Email Subject</p>
                    <CopyButton label="Copy" text={article.emailSubject} />
                  </div>
                  <p className="text-[12.5px] font-semibold text-[#111827]">{article.emailSubject}</p>
                </div>
              )}
              {article.previewText && (
                <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider">Preview Text</p>
                    <CopyButton label="Copy" text={article.previewText} />
                  </div>
                  <p className="text-[12.5px] text-[#374151]">{article.previewText}</p>
                </div>
              )}
            </div>

            {/* Article body */}
            {article.articleBody && (
              <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider">Article Body</p>
                  <CopyButton label="Copy Article" text={buildNewsletter()} />
                </div>
                <div className="prose prose-sm max-w-none text-[12.5px] text-[#374151] leading-relaxed whitespace-pre-wrap font-[inherit]">
                  {article.articleBody}
                </div>
              </div>
            )}

            {/* Why it matters */}
            {article.whyItMatters && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3.5">
                <p className="text-[9.5px] font-bold text-[#0866F5] uppercase tracking-wider mb-1.5">Why This Matters</p>
                <p className="text-[12.5px] text-[#374151] leading-relaxed">{article.whyItMatters}</p>
              </div>
            )}

            {/* Key takeaways */}
            {article.keyTakeaways.length > 0 && (
              <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
                <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Key Takeaways</p>
                <ol className="flex flex-col gap-2">
                  {article.keyTakeaways.map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0866F5] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-[12.5px] text-[#374151] leading-relaxed">{t}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Instagram caption */}
            {article.instagramCaption && (
              <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider">Instagram Caption</p>
                  <CopyButton label="Copy Instagram" text={article.instagramCaption} />
                </div>
                <p className="text-[12px] text-[#374151] whitespace-pre-wrap leading-relaxed">{article.instagramCaption}</p>
              </div>
            )}
          </div>
        </details>

      </div>
    </div>
  );
}

// ─── StoryCard ────────────────────────────────────────────────────────────────

function StoryCard({
  story,
  writingId,
  weekday,
  onWritePost,
}: {
  story:       NewsStory;
  writingId:   string | null;
  weekday:     Weekday;
  onWritePost: (story: NewsStory) => void;
}) {
  const isWriting = writingId === String(story.rank);
  const pubDate   = formatDate(story.publishedAt);
  const weekdayDef = WEEKDAYS.find((w) => w.key === weekday);

  return (
    <div
      className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Card header */}
      <div className="px-5 pt-4 pb-3 border-b border-[#F8FAFD]">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[11px] font-bold text-[#6B7280] shrink-0 mt-0.5">
            {story.rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${categoryStyle(story.category)}`}>
                {story.category}
              </span>
              {pubDate && (
                <span className="text-[10.5px] text-[#9CA3AF]">{pubDate}</span>
              )}
            </div>
            <h3 className="text-[14.5px] font-bold text-[#111827] leading-snug">
              {story.headline}
            </h3>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 flex flex-col gap-3">

        {/* What changed */}
        {story.whatIsNew && (
          <div>
            <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">What Changed</p>
            <p className="text-[12.5px] text-[#374151] leading-relaxed">{story.whatIsNew}</p>
          </div>
        )}

        {/* Why agencies should care */}
        {story.whatItHelpsDo && (
          <div className="flex items-start gap-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-3.5 py-2.5">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="#0866F5" className="shrink-0 mt-0.5" aria-hidden="true">
              <path d="M13 4l-7 7-3-3 1-1 2 2 6-6 1 1z"/>
            </svg>
            <div>
              <p className="text-[9.5px] font-bold text-[#0866F5] uppercase tracking-wider mb-0.5">Why Agencies Should Care</p>
              <p className="text-[12.5px] font-semibold text-[#1D4ED8] leading-snug">{story.whatItHelpsDo}</p>
            </div>
          </div>
        )}

        {/* Client implication + suggested angle */}
        <div className="grid sm:grid-cols-2 gap-2.5">
          {story.bestFor && (
            <div className="bg-[#F8FAFD] border border-[#F1F5F9] rounded-xl px-3.5 py-2.5">
              <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">What It Means for Clients</p>
              <p className="text-[12px] text-[#374151] leading-relaxed">{story.bestFor}</p>
            </div>
          )}
          {story.businessOpportunity && (
            <div className="bg-[#F8FAFD] border border-[#F1F5F9] rounded-xl px-3.5 py-2.5">
              <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">
                {weekdayDef ? `${weekdayDef.theme} Angle` : "Suggested Post Angle"}
              </p>
              <p className="text-[12px] text-[#374151] leading-relaxed">{story.businessOpportunity}</p>
            </div>
          )}
        </div>

        {/* Practical action */}
        {story.howToTryIt && (
          <div className="flex items-start gap-2">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="#6B7280" className="shrink-0 mt-0.5" aria-hidden="true">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10H7V7h2v4zm0-5H7V4h2v2z"/>
            </svg>
            <div>
              <p className="text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">Practical First Step</p>
              <p className="text-[12px] text-[#374151] leading-relaxed">{story.howToTryIt}</p>
            </div>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-5 pb-4 flex items-center justify-between pt-1 border-t border-[#F8FAFD]">
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
              <IconExternalLink />
            </a>
          )}
          <button
            type="button"
            disabled={!!writingId}
            onClick={() => onWritePost(story)}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold bg-[#0866F5] hover:bg-[#0757D4] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWriting ? (
              <>
                <IconSpin />
                Writing…
              </>
            ) : (
              <>
                <IconPencil />
                Write LinkedIn Post
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
  const [weekday,     setWeekday]     = useState<Weekday>(getTodayWeekday);
  const [todayKey]                    = useState<Weekday>(getTodayWeekday);
  const [period,      setPeriod]      = useState<Period>("24h");
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [stories,     setStories]     = useState<NewsStory[]>([]);

  const [writingId,   setWritingId]   = useState<string | null>(null);
  const [writeError,  setWriteError]  = useState<string | null>(null);
  const [article,     setArticle]     = useState<GeneratedArticle | null>(null);
  const [articleWeekday, setArticleWeekday] = useState<Weekday>("monday");

  const outputRef = useRef<HTMLDivElement>(null);

  // Clear results when weekday or period changes
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
      const res  = await fetch("/api/internal/admin/news/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ period, weekday }),
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
      const res  = await fetch("/api/internal/admin/news/article", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          headline:            story.headline,
          whatIsNew:           story.whatIsNew,
          whatItHelpsDo:       story.whatItHelpsDo,
          businessOpportunity: story.businessOpportunity,
          howToTryIt:          story.howToTryIt,
          sourceUrl:           story.sourceUrl,
          sourceName:          story.sourceName,
          category:            story.category,
          bestFor:             story.bestFor,
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

  const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "48h", label: "Last 48 Hours" },
    { value: "7d",  label: "Last 7 Days" },
  ];

  const isBusy = searching || !!writingId;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0866F5" aria-hidden="true">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
              <circle cx="4" cy="4" r="2" fill="#0866F5"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-[#111827]">Agency LinkedIn Studio</h1>
        </div>
        <p className="text-[13px] text-[#6B7280]">
          Turn AI search news into LinkedIn posts that help agencies win and serve clients.
        </p>
      </div>

      {/* Weekday cards */}
      <WeekdayCards
        selected={weekday}
        today={todayKey}
        onChange={handleWeekdayChange}
        disabled={isBusy}
      />

      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {/* Period filter */}
        <div className="flex items-center bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-1 gap-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePeriodChange(opt.value)}
              disabled={isBusy}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors disabled:opacity-50 ${
                period === opt.value
                  ? "bg-white text-[#111827] shadow-sm border border-[#E2E8F0]"
                  : "text-[#9CA3AF] hover:text-[#374151]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Find Agency News button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={isBusy}
          className="flex items-center gap-2 bg-[#0866F5] hover:bg-[#0757D4] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          {searching ? (
            <>
              <IconSpin size={13} />
              Searching…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M11.7 10.3l2.9 2.9-1.4 1.4-2.9-2.9A6 6 0 112 7a6 6 0 019.7 3.3zm-1.4.4A4 4 0 107 3a4 4 0 003.3 7.7z"/>
              </svg>
              Find Agency News
            </>
          )}
        </button>

        {/* Context label */}
        {!searching && (
          <span className="text-[11px] text-[#9CA3AF]">
            {WEEKDAYS.find((w) => w.key === weekday)?.theme} · {PERIOD_OPTIONS.find((p) => p.value === period)?.label}
          </span>
        )}
      </div>

      {/* Loading state */}
      {searching && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center mb-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
            <IconSpin size={20} />
          </div>
          <p className="text-[15px] font-semibold text-[#111827] mb-1">
            Finding {WEEKDAYS.find((w) => w.key === weekday)?.theme} news…
          </p>
          <p className="text-[12px] text-[#9CA3AF]">
            Searching for agency-relevant AI stories from the {PERIOD_OPTIONS.find((p) => p.value === period)?.label.toLowerCase()}. Usually takes 15–30 seconds.
          </p>
        </div>
      )}

      {/* Search error */}
      {searchError && !searching && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-5 py-4 flex items-start gap-3 mb-6">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#DC2626" className="shrink-0 mt-0.5" aria-hidden="true">
            <path d="M8 1L1 13h14L8 1zm0 3l4.5 7.8H3.5L8 4zM7 8v2h2V8H7zm0 3v1h2v-1H7z"/>
          </svg>
          <p className="text-[13px] text-[#991B1B] font-medium">{searchError}</p>
        </div>
      )}

      {/* Empty state — no stories found */}
      {!searching && !searchError && stories.length === 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="w-12 h-12 rounded-2xl bg-[#F8FAFD] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#9CA3AF" aria-hidden="true">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
              <circle cx="4" cy="4" r="2" fill="#9CA3AF"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[#374151] mb-1">No stories yet</p>
          <p className="text-[12px] text-[#9CA3AF] max-w-xs mx-auto">
            Select a weekday angle above, then click &ldquo;Find Agency News&rdquo; to surface relevant stories for your LinkedIn post.
          </p>
        </div>
      )}

      {/* Story cards */}
      {stories.length > 0 && !searching && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
              {stories.length} {stories.length === 1 ? "Story" : "Stories"} — {WEEKDAYS.find((w) => w.key === weekday)?.theme}
            </p>
            {writingId && (
              <p className="text-[12px] text-[#0866F5] font-medium animate-pulse">
                Researching and writing LinkedIn post…
              </p>
            )}
          </div>

          {/* No-results note when search returned empty */}
          {stories.length === 0 && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-5 py-4 text-[12.5px] text-[#92400E]">
              No qualifying stories found for the selected angle and time window. Try the &ldquo;Last 7 Days&rdquo; filter or switch to a broader weekday angle.
            </div>
          )}

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
              weekday={weekday}
              onWritePost={handleWritePost}
            />
          ))}
        </div>
      )}

      {/* Output panel */}
      {article && (
        <div ref={outputRef}>
          <OutputPanel
            article={article}
            weekday={articleWeekday}
            onClose={() => setArticle(null)}
          />
        </div>
      )}

    </div>
  );
}
