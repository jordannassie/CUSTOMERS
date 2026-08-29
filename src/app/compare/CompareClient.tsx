"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle, CheckCircle2, XCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";
import type { WebsiteSignals } from "@/app/api/public/compare/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompareResult {
  mine: WebsiteSignals;
  them: WebsiteSignals;
  diff: number;
  leader: "you" | "competitor" | "tie";
  insights: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreLabel(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 45) return "Competitive";
  return "Needs Improvement";
}

function scoreLabelColor(score: number): string {
  if (score >= 70) return "text-[#15803D]";
  if (score >= 45) return "text-[#0866F5]";
  return "text-[#B45309]";
}

function scoreLabelBg(score: number): string {
  if (score >= 70) return "bg-[#F0FDF4] border-[#BBF7D0]";
  if (score >= 45) return "bg-[#EFF6FF] border-[#BFDBFE]";
  return "bg-[#FFFBEB] border-[#FDE68A]";
}

function getFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/** Derive sub-scores from raw WebsiteSignals (0–100) */
function techScore(s: WebsiteSignals): number {
  if (!s.accessible) return 0;
  let score = 0;
  if (s.schemaTypes.length > 0) score += 40;
  if (s.hasLocalBusiness) score += 30;
  if (s.h1Count > 0) score += 15;
  if (s.h2Count > 0) score += 15;
  return score;
}

function contentScore(s: WebsiteSignals): number {
  if (!s.accessible) return 0;
  let score = 0;
  if (s.title.length > 10) score += 20;
  if (s.description.length > 50) score += 25;
  if (s.wordCount > 500) score += 30;
  else if (s.wordCount > 200) score += 15;
  if (s.h1Count > 0) score += 15;
  if (s.h2Count > 2) score += 10;
  return Math.min(100, score);
}

function localScore(s: WebsiteSignals): number {
  if (!s.accessible) return 0;
  let score = 0;
  if (s.hasPhone) score += 30;
  if (s.hasAddress) score += 30;
  if (s.hasContactForm) score += 20;
  if (s.hasReviews) score += 20;
  return score;
}

interface Finding {
  severity: "Critical" | "High Impact" | "Opportunity";
  title: string;
  detail: string;
  winner: "you" | "competitor" | "neither";
}

function buildFindings(mine: WebsiteSignals, them: WebsiteSignals): Finding[] {
  const findings: Finding[] = [];

  // Schema
  if (!mine.schemaTypes.length && them.schemaTypes.length) {
    findings.push({
      severity: "Critical",
      title: "Missing business schema markup",
      detail: "Your site lacks structured data (Schema.org) that AI platforms use to identify and recommend businesses.",
      winner: "competitor",
    });
  } else if (!mine.schemaTypes.length && !them.schemaTypes.length) {
    findings.push({
      severity: "High Impact",
      title: "Neither site has schema markup",
      detail: "Adding Schema.org LocalBusiness markup is a high-leverage fix for both sites.",
      winner: "neither",
    });
  }

  // Local business
  if (!mine.hasLocalBusiness && them.hasLocalBusiness) {
    findings.push({
      severity: "High Impact",
      title: "Competitor has local business markup",
      detail: "Local business structured data signals trust and location to AI — your competitor already has it.",
      winner: "competitor",
    });
  }

  // Content depth
  if (mine.wordCount < 300 && them.wordCount >= 300) {
    findings.push({
      severity: "High Impact",
      title: "Less authoritative content",
      detail: "Competitors with more in-depth, structured content tend to be recommended more often in AI answers.",
      winner: "competitor",
    });
  }

  // Reviews
  if (!mine.hasReviews && them.hasReviews) {
    findings.push({
      severity: "High Impact",
      title: "Weaker review / trust signals",
      detail: "Reviews and testimonials increase AI citation likelihood by demonstrating social proof.",
      winner: "competitor",
    });
  }

  // Contact / booking
  if (!mine.hasContactForm && them.hasContactForm) {
    findings.push({
      severity: "Opportunity",
      title: "Contact or booking not detected",
      detail: "AI agents look for clear conversion paths. Adding a booking or contact form improves action-ability.",
      winner: "competitor",
    });
  }

  // Phone
  if (!mine.hasPhone && them.hasPhone) {
    findings.push({
      severity: "Opportunity",
      title: "Phone number missing from homepage",
      detail: "Phone numbers are part of NAP (Name, Address, Phone) signals used to verify business credibility.",
      winner: "competitor",
    });
  }

  // You're winning areas
  if (mine.schemaTypes.length && !them.schemaTypes.length) {
    findings.push({
      severity: "Opportunity",
      title: "Your schema is an advantage — maintain it",
      detail: "You have structured data your competitor lacks. Expanding it further will widen the gap.",
      winner: "you",
    });
  }

  return findings.slice(0, 4);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Count-up hook */
function useCountUp(target: number, duration = 1200, shouldStart = false): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldStart) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, shouldStart]);

  return value;
}

/** Circular SVG score gauge */
function ScoreCircle({ score, isWinner, animate }: { score: number; isWinner: boolean; animate: boolean }) {
  const R = 48;
  const C = 2 * Math.PI * R;
  const displayed = useCountUp(score, 1200, animate);
  const offset = C - (displayed / 100) * C;

  const stroke = isWinner ? "#0866F5" : "#9CA3AF";
  const textColor = isWinner ? "#0866F5" : "#374151";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-black leading-none" style={{ color: textColor }}>
          {displayed}
        </span>
        <span className="text-[10px] font-semibold text-[#9CA3AF] mt-0.5 tracking-wide">/ 100</span>
      </div>
    </div>
  );
}

/** Animated metric progress bar */
function MetricBar({ value, isWinner, animate }: { value: number; isWinner: boolean; animate: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const id = setTimeout(() => setWidth(value), 100);
    return () => clearTimeout(id);
  }, [value, animate]);

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-[#F1F5F9] rounded-full h-[5px] overflow-hidden">
        <div
          className="h-[5px] rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            backgroundColor: isWinner ? "#0866F5" : "#9CA3AF",
          }}
        />
      </div>
      <span className="text-[12px] font-semibold text-[#374151] w-8 text-right shrink-0">{value}%</span>
    </div>
  );
}

/** Three category comparison cards */
function MetricCard({
  icon, label, description, myScore, themScore, myDomain, themDomain, animate,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  myScore: number;
  themScore: number;
  myDomain: string;
  themDomain: string;
  animate: boolean;
}) {
  const myWins = myScore >= themScore;
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#0866F5]">
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#111827]">{label}</p>
          <p className="text-[10.5px] text-[#9CA3AF]">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#6B7280] w-24 truncate shrink-0">{myDomain}</span>
          <MetricBar value={myScore} isWinner={myWins} animate={animate} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#6B7280] w-24 truncate shrink-0">{themDomain}</span>
          <MetricBar value={themScore} isWinner={!myWins} animate={animate} />
        </div>
      </div>
    </div>
  );
}

/** Signal table row */
function SignalRow({
  label, description, mine, them,
}: { label: string; description: string; mine: boolean; them: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_80px_80px] items-center py-3 border-b border-[#F1F5F9] last:border-0">
      <div>
        <p className="text-[12.5px] font-medium text-[#111827]">{label}</p>
        <p className="text-[11px] text-[#9CA3AF]">{description}</p>
      </div>
      <div className="flex justify-center">
        {mine ? (
          <CheckCircle2 size={16} className="text-[#0866F5]" />
        ) : (
          <XCircle size={16} className="text-[#D1D5DB]" />
        )}
      </div>
      <div className="flex justify-center">
        {them ? (
          <CheckCircle2 size={16} className="text-[#0866F5]" />
        ) : (
          <XCircle size={16} className="text-[#D1D5DB]" />
        )}
      </div>
    </div>
  );
}

// ─── Website screenshot components ───────────────────────────────────────────

/** Polished fallback shown when a screenshot cannot be loaded */
function ScreenshotFallback({ domain }: { domain: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#F3F5F8] px-4">
      <div className="w-full max-w-[240px]">
        {/* Fake browser chrome */}
        <div className="bg-[#DDE1E7] rounded-t-xl px-3 py-2 flex items-center gap-1.5">
          <div className="flex gap-1 shrink-0">
            {(["#FF5F57", "#FEBC2E", "#28C840"] as const).map((c) => (
              <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} aria-hidden="true" />
            ))}
          </div>
          <div className="flex-1 bg-white/70 rounded text-[8px] text-[#9CA3AF] px-1.5 py-0.5 truncate text-center">
            {domain}
          </div>
        </div>
        <div className="bg-white border border-t-0 border-[#E2E8F0] rounded-b-xl px-4 py-5 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFavicon(domain)}
            alt=""
            width={24}
            height={24}
            className="rounded"
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium text-[#9CA3AF] text-center">{domain}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Loads a website screenshot from our secure server-side proxy.
 * Shows a skeleton while loading and a branded fallback on failure.
 * Screenshot failure never affects comparison scores.
 */
function WebsiteScreenshot({ domain }: { domain: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const src = `/api/public/screenshot?domain=${encodeURIComponent(domain)}`;

  return (
    <a
      href={`https://${domain}`}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block w-full overflow-hidden border-b border-[#E2E8F0] bg-[#F3F5F8] aspect-video"
      aria-label={`Open ${domain} in a new tab`}
    >
      {/* Skeleton shimmer while loading */}
      {status === "loading" && (
        <div className="absolute inset-0 skeleton-shimmer" aria-hidden="true" />
      )}

      {/* Polished fallback when screenshot unavailable */}
      {status === "error" && <ScreenshotFallback domain={domain} />}

      {/* The screenshot itself — hidden until loaded to prevent flicker */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Screenshot of ${domain}`}
        className={`w-full h-full object-cover object-top ${
          status !== "loaded" ? "opacity-0 absolute inset-0" : "opacity-100"
        }`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />

      {/* External-link affordance (pointer-events-none so the <a> handles the click) */}
      {status === "loaded" && (
        <span
          className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-md flex items-center justify-center transition-colors pointer-events-none"
          aria-hidden="true"
        >
          <ExternalLink size={11} className="text-white" />
        </span>
      )}
    </a>
  );
}

// Small AI platform logos in the header
const AI_PLATFORM_ICONS = [
  { name: "ChatGPT",    src: "/icons/ai-platforms/chatgpt.svg"    },
  { name: "Perplexity", src: "/icons/ai-platforms/perplexity.svg" },
  { name: "Gemini",     src: "/icons/ai-platforms/gemini.svg"     },
  { name: "Google AI",  src: "/icons/ai-platforms/google.svg"     },
];

const LOGO = "/images/logos/logo-black.png";

// ─── Main component ───────────────────────────────────────────────────────────

export default function CompareClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const initialMy   = searchParams.get("my")   ?? "";
  const initialThem = searchParams.get("them")  ?? "";

  const [myUrl,   setMyUrl]   = useState(initialMy);
  const [themUrl, setThemUrl] = useState(initialThem);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<CompareResult | null>(null);
  const [animate, setAnimate] = useState(false);
  const [analysisDate, setAnalysisDate] = useState("");

  const runComparison = useCallback(async (my: string, them: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnimate(false);
    try {
      const res  = await fetch("/api/public/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myUrl: my, competitorUrl: them }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Comparison failed.");
      setResult(data as CompareResult);
      setAnalysisDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
      // Trigger animations after a tiny delay so layout is painted
      setTimeout(() => setAnimate(true), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't complete this comparison. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialMy && initialThem) runComparison(initialMy, initialThem);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const my   = myUrl.trim();
    const them = themUrl.trim();
    if (!my || !them) return;
    router.replace(`/compare?my=${encodeURIComponent(my)}&them=${encodeURIComponent(them)}`);
    runComparison(my, them);
  }

  function buildSignupUrl(): string {
    const my   = result?.mine.domain ?? myUrl;
    const them = result?.them.domain ?? themUrl;
    const next = `/dashboard?my=${encodeURIComponent(my)}&them=${encodeURIComponent(them)}`;
    return `/signup?next=${encodeURIComponent(next)}&my=${encodeURIComponent(my)}&them=${encodeURIComponent(them)}`;
  }

  // Derived values
  const myScore   = result?.mine.aiReadinessScore ?? 0;
  const themScore = result?.them.aiReadinessScore ?? 0;
  const myWins    = myScore >= themScore;
  const scoreDiff = Math.abs(myScore - themScore);
  const winningDomain = myWins ? result?.mine.domain : result?.them.domain;
  const findings  = result ? buildFindings(result.mine, result.them) : [];

  const myTech    = result ? techScore(result.mine)    : 0;
  const themTech  = result ? techScore(result.them)    : 0;
  const myContent = result ? contentScore(result.mine) : 0;
  const themContent = result ? contentScore(result.them) : 0;
  const myLocal   = result ? localScore(result.mine)   : 0;
  const themLocal = result ? localScore(result.them)   : 0;

  const severityConfig = {
    Critical:    { color: "text-[#DC2626]", bg: "bg-[#FEF2F2] border-[#FECACA]", icon: <AlertCircle size={12} className="text-[#DC2626]" /> },
    "High Impact": { color: "text-[#D97706]", bg: "bg-[#FFFBEB] border-[#FDE68A]", icon: <AlertTriangle size={12} className="text-[#D97706]" /> },
    Opportunity: { color: "text-[#0866F5]", bg: "bg-[#EFF6FF] border-[#BFDBFE]", icon: <Info size={12} className="text-[#0866F5]" /> },
  };

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFD" }}>

      {/* ── Compact top nav ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Customers.Direct — Home">
              <Image src={LOGO} alt="Customers.Direct" width={140} height={32} className="h-7 w-auto" priority />
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[#D1D5DB]">|</span>
              <span className="text-[12px] font-semibold text-[#6B7280] tracking-wide uppercase">AI Competitor Analysis</span>
            </div>
          </div>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 bg-[#0866F5] hover:bg-[#0757D4] text-white text-[12.5px] font-semibold px-4 py-2 rounded-full transition-colors active:scale-[0.97]"
          >
            Start Free Trial
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl p-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center flex-1 px-3 py-2 gap-2">
              {result && <img src={getFavicon(result.mine.domain)} alt="" width={14} height={14} className="rounded-sm shrink-0" />}
              <input
                type="text" value={myUrl}
                onChange={(e) => setMyUrl(e.target.value)}
                placeholder="yourbusiness.com"
                className="flex-1 text-[13.5px] text-[#111827] placeholder:text-[#9CA3AF] bg-transparent focus:outline-none"
                disabled={loading}
              />
            </div>
            <div className="hidden sm:flex items-center justify-center px-2">
              <span className="text-[10px] font-bold text-[#9CA3AF] bg-[#F1F5F9] rounded-full px-2 py-0.5 tracking-wider">VS</span>
            </div>
            <div className="flex items-center flex-1 px-3 py-2 gap-2 border-t sm:border-t-0 sm:border-l border-[#F1F5F9]">
              {result && <img src={getFavicon(result.them.domain)} alt="" width={14} height={14} className="rounded-sm shrink-0" />}
              <input
                type="text" value={themUrl}
                onChange={(e) => setThemUrl(e.target.value)}
                placeholder="competitor.com"
                className="flex-1 text-[13.5px] text-[#111827] placeholder:text-[#9CA3AF] bg-transparent focus:outline-none"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !myUrl.trim() || !themUrl.trim()}
              className="flex items-center justify-center gap-2 bg-[#0866F5] hover:bg-[#0757D4] text-white text-[13px] font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 shrink-0 active:scale-[0.97] m-0.5"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {loading ? "Comparing…" : "Compare Free"}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-[13px] text-[#991B1B] bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </form>

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-white rounded-2xl border border-[#E2E8F0]" />
            <div className="h-52 bg-white rounded-2xl border border-[#E2E8F0]" />
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-2xl border border-[#E2E8F0]" />)}
            </div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="flex flex-col gap-6">

            {/* 1. Executive summary header */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] px-6 py-5" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Analysis Date</span>
                    <span className="text-[10px] font-semibold text-[#6B7280]">{analysisDate}</span>
                  </div>
                  <h1 className="text-[18px] sm:text-[22px] font-bold text-[#111827] leading-snug mb-1">
                    <span className="text-[#0866F5]">{winningDomain}</span> currently has the stronger AI‑search foundation
                  </h1>
                  {scoreDiff > 0 ? (
                    <p className="text-[13px] text-[#6B7280]">
                      We identified a <strong className="text-[#111827]">{scoreDiff}‑point</strong> readiness gap based on the websites and signals analyzed.
                    </p>
                  ) : (
                    <p className="text-[13px] text-[#6B7280]">Both sites show similar AI-search readiness. A full scan reveals the real gap.</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Analyzed on leading AI platforms</p>
                  <div className="flex items-center gap-2">
                    {AI_PLATFORM_ICONS.map(({ name, src }) => (
                      <div key={name} className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                          <img src={src} alt={name} width={18} height={18} className="object-contain" />
                        </div>
                        <span className="text-[9px] font-medium text-[#9CA3AF]">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Premium comparison panel */}
            <div
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
            >
              {/* ── Desktop (sm+): 3-column grid ──────────────────────── */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_108px_1fr]">

                {/* My site */}
                <div
                  className={`flex flex-col overflow-hidden border-r border-[#F1F5F9] ${
                    myWins ? "ring-2 ring-inset ring-[#0866F5]/30 bg-[#F0F6FF]" : ""
                  }`}
                >
                  <WebsiteScreenshot domain={result.mine.domain} />
                  <div className="p-7 flex flex-col items-center text-center">
                    {myWins && (
                      <div className="mb-2 px-2 py-0.5 bg-[#0866F5] text-white text-[9px] font-bold uppercase tracking-widest rounded-full">
                        Winning
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src={getFavicon(result.mine.domain)} alt="" width={14} height={14} className="rounded-sm" />
                      <p className="text-[12px] font-semibold text-[#374151] truncate max-w-[120px]">{result.mine.domain}</p>
                    </div>
                    <ScoreCircle score={myScore} isWinner={myWins} animate={animate} />
                    <p className="text-[10.5px] text-[#9CA3AF] mt-1 mb-2">AI Readiness Score</p>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${scoreLabelBg(myScore)} ${scoreLabelColor(myScore)}`}>
                      {scoreLabel(myScore)}
                    </span>
                  </div>
                </div>

                {/* Center visibility gap */}
                <div className="flex flex-col items-center justify-center bg-[#F8FAFD] px-2 py-6 border-r border-[#F1F5F9] gap-1">
                  <div className="text-[28px] font-black text-[#111827] leading-none">{scoreDiff}</div>
                  <div className="text-[8.5px] font-bold text-[#9CA3AF] uppercase tracking-wider text-center leading-tight">
                    {"point\nvisibility\ngap"}
                  </div>
                </div>

                {/* Competitor */}
                <div
                  className={`flex flex-col overflow-hidden ${
                    !myWins ? "ring-2 ring-inset ring-[#0866F5]/30 bg-[#F0F6FF]" : ""
                  }`}
                >
                  <WebsiteScreenshot domain={result.them.domain} />
                  <div className="p-7 flex flex-col items-center text-center">
                    {!myWins && (
                      <div className="mb-2 px-2 py-0.5 bg-[#0866F5] text-white text-[9px] font-bold uppercase tracking-widest rounded-full">
                        Winning
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src={getFavicon(result.them.domain)} alt="" width={14} height={14} className="rounded-sm" />
                      <p className="text-[12px] font-semibold text-[#374151] truncate max-w-[120px]">{result.them.domain}</p>
                    </div>
                    <ScoreCircle score={themScore} isWinner={!myWins} animate={animate} />
                    <p className="text-[10.5px] text-[#9CA3AF] mt-1 mb-2">AI Readiness Score</p>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${scoreLabelBg(themScore)} ${scoreLabelColor(themScore)}`}>
                      {scoreLabel(themScore)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Mobile (<sm): stacked layout ──────────────────────── */}
              <div className="sm:hidden flex flex-col divide-y divide-[#F1F5F9]">

                {/* My site */}
                <div className={`flex flex-col overflow-hidden ${myWins ? "ring-2 ring-inset ring-[#0866F5]/30 bg-[#F0F6FF]" : ""}`}>
                  <WebsiteScreenshot domain={result.mine.domain} />
                  <div className="p-5 flex flex-col items-center text-center">
                    {myWins && (
                      <div className="mb-2 px-2 py-0.5 bg-[#0866F5] text-white text-[9px] font-bold uppercase tracking-widest rounded-full">
                        Winning
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src={getFavicon(result.mine.domain)} alt="" width={14} height={14} className="rounded-sm" />
                      <p className="text-[12px] font-semibold text-[#374151] truncate max-w-[150px]">{result.mine.domain}</p>
                    </div>
                    <ScoreCircle score={myScore} isWinner={myWins} animate={animate} />
                    <p className="text-[10.5px] text-[#9CA3AF] mt-1 mb-2">AI Readiness Score</p>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${scoreLabelBg(myScore)} ${scoreLabelColor(myScore)}`}>
                      {scoreLabel(myScore)}
                    </span>
                  </div>
                </div>

                {/* Visibility gap summary — mobile */}
                <div className="flex items-center justify-center gap-3 bg-[#F8FAFD] py-4 px-4">
                  <span className="text-[26px] font-black text-[#111827] leading-none">{scoreDiff}</span>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                    point visibility gap
                  </span>
                </div>

                {/* Competitor */}
                <div className={`flex flex-col overflow-hidden ${!myWins ? "ring-2 ring-inset ring-[#0866F5]/30 bg-[#F0F6FF]" : ""}`}>
                  <WebsiteScreenshot domain={result.them.domain} />
                  <div className="p-5 flex flex-col items-center text-center">
                    {!myWins && (
                      <div className="mb-2 px-2 py-0.5 bg-[#0866F5] text-white text-[9px] font-bold uppercase tracking-widest rounded-full">
                        Winning
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src={getFavicon(result.them.domain)} alt="" width={14} height={14} className="rounded-sm" />
                      <p className="text-[12px] font-semibold text-[#374151] truncate max-w-[150px]">{result.them.domain}</p>
                    </div>
                    <ScoreCircle score={themScore} isWinner={!myWins} animate={animate} />
                    <p className="text-[10.5px] text-[#9CA3AF] mt-1 mb-2">AI Readiness Score</p>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${scoreLabelBg(themScore)} ${scoreLabelColor(themScore)}`}>
                      {scoreLabel(themScore)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Three metric comparison cards */}
            {(result.mine.accessible || result.them.accessible) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard
                  icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L1 4v4c0 4.4 3 7.4 7 8 4-0.6 7-3.6 7-8V4L8 1zm0 2l5 2.2V8c0 3.3-2.1 5.6-5 6.3-2.9-0.7-5-3-5-6.3V5.2L8 3z"/></svg>}
                  label="Technical Readiness"
                  description="Schema, structure, crawlability"
                  myScore={myTech}
                  themScore={themTech}
                  myDomain={result.mine.domain}
                  themDomain={result.them.domain}
                  animate={animate}
                />
                <MetricCard
                  icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v2H2V2zm0 4h12v2H2V6zm0 4h8v2H2v-2z"/></svg>}
                  label="Content Authority"
                  description="Depth, relevance, E-E-A-T"
                  myScore={myContent}
                  themScore={themContent}
                  myDomain={result.mine.domain}
                  themDomain={result.them.domain}
                  animate={animate}
                />
                <MetricCard
                  icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C5.2 0 3 2.2 3 5c0 3.8 5 11 5 11s5-7.2 5-11C13 2.2 10.8 0 8 0zm0 7c-1.1 0-2-0.9-2-2s0.9-2 2-2 2 0.9 2 2-0.9 2-2 2z"/></svg>}
                  label="Local Trust Signals"
                  description="Local info, reviews, consistency"
                  myScore={myLocal}
                  themScore={themLocal}
                  myDomain={result.mine.domain}
                  themDomain={result.them.domain}
                  animate={animate}
                />
              </div>
            )}

            {/* 4. Priority Findings */}
            {findings.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 1L2 13h12L8 1z" stroke="#0866F5" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M8 6v3M8 11v1" stroke="#0866F5" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <h2 className="text-[14px] font-bold text-[#111827]">Priority Findings</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {findings.map((f, i) => {
                    const cfg = severityConfig[f.severity];
                    return (
                      <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#F1F5F9]">
                        <div className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon}
                          {f.severity}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#111827] mb-0.5">{f.title}</p>
                          <p className="text-[12px] text-[#6B7280] leading-relaxed">{f.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Conversion panel */}
            <div
              className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0A2463 0%, #0866F5 60%, #2196F3 100%)" }}
            >
              <div className="absolute inset-0 opacity-10" aria-hidden="true"
                style={{ background: "radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 60%)" }} />
              <div className="relative flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-white/70 mb-1">Complete action plan included</p>
                  <h2 className="text-[20px] sm:text-[24px] font-bold text-white leading-tight mb-2">
                    Close your {scoreDiff > 0 ? `${scoreDiff}-point` : ""} AI visibility gap
                  </h2>
                  <p className="text-[13px] text-white/70 leading-relaxed">
                    Unlock your complete action plan, ongoing competitor monitoring and Claude-ready fixes.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <Link
                    href={buildSignupUrl()}
                    className="flex items-center gap-2 bg-white text-[#0866F5] text-[14px] font-bold px-6 py-3.5 rounded-xl hover:bg-blue-50 transition-colors active:scale-[0.97] shadow-lg whitespace-nowrap"
                  >
                    Show Me How to Beat Them
                    <ArrowRight size={14} />
                  </Link>
                  <div className="flex items-center gap-3 text-[11px] text-white/50">
                    <span>✓ AI-ready fixes</span>
                    <span>✓ Continuous monitoring</span>
                    <span>✓ Track vs competitors</span>
                  </div>
                  <p className="text-[10.5px] text-white/40">Free during beta · No credit card required</p>
                </div>
              </div>
            </div>

            {/* 6. Signal comparison table */}
            {(result.mine.accessible || result.them.accessible) && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_80px_80px] items-center px-5 py-3 bg-[#F8FAFD] border-b border-[#E2E8F0]">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Signal</p>
                  <div className="flex flex-col items-center">
                    <img src={getFavicon(result.mine.domain)} alt="" width={14} height={14} className="rounded-sm mb-0.5" />
                    <p className="text-[10.5px] font-semibold text-[#374151] text-center truncate max-w-[72px]">
                      {result.mine.domain}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <img src={getFavicon(result.them.domain)} alt="" width={14} height={14} className="rounded-sm mb-0.5" />
                    <p className="text-[10.5px] font-semibold text-[#374151] text-center truncate max-w-[72px]">
                      {result.them.domain}
                    </p>
                  </div>
                </div>
                <div className="px-5">
                  <SignalRow label="Structured data / Schema" description="Implementation of critical schema markup" mine={result.mine.schemaTypes.length > 0} them={result.them.schemaTypes.length > 0} />
                  <SignalRow label="Local business markup" description="NAP, business type, and location data" mine={result.mine.hasLocalBusiness} them={result.them.hasLocalBusiness} />
                  <SignalRow label="Meta description" description="Quality and optimization of meta descriptions" mine={result.mine.description.length > 50} them={result.them.description.length > 50} />
                  <SignalRow label="Phone number" description="Presence and consistency of phone number" mine={result.mine.hasPhone} them={result.them.hasPhone} />
                  <SignalRow label="Address / location" description="Presence and consistency of address" mine={result.mine.hasAddress} them={result.them.hasAddress} />
                  <SignalRow label="Contact / booking form" description="Accessibility of contact or booking options" mine={result.mine.hasContactForm} them={result.them.hasContactForm} />
                  <SignalRow label="Reviews / testimonials" description="Quantity and recency of customer reviews" mine={result.mine.hasReviews} them={result.them.hasReviews} />
                </div>
              </div>
            )}

            {/* 7. Methodology disclaimer */}
            <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed max-w-2xl mx-auto">
              This comparison measures website and AI-search readiness signals. Live recommendations may vary by AI platform, prompt, location and time.
              Full AI visibility scans (ChatGPT / Claude / Perplexity / Gemini) are available after signup.
            </p>

          </div>
        )}
      </div>
    </div>
  );
}
