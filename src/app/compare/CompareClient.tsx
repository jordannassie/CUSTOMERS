"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight, Loader2, AlertCircle, TrendingUp, TrendingDown,
  Minus, CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import type { WebsiteSignals } from "@/app/api/public/compare/route";

interface CompareResult {
  mine: WebsiteSignals;
  them: WebsiteSignals;
  diff: number;
  leader: "you" | "competitor" | "tie";
  insights: string[];
}

function ScoreBar({ score, isWinner }: { score: number; isWinner: boolean }) {
  return (
    <div className="w-full bg-[#F0F0EC] rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${
          isWinner ? "bg-[#2563EB]" : "bg-[#D4D4CF]"
        }`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function MetricRow({
  label,
  mine,
  them,
}: {
  label: string;
  mine: boolean;
  them: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#F0F0EC] last:border-0">
      <span className="text-[12.5px] text-[#777773]">{label}</span>
      <div className="flex items-center gap-8">
        <span className="w-5 flex justify-center">
          {mine ? (
            <CheckCircle2 size={14} className="text-[#2563EB]" />
          ) : (
            <XCircle size={14} className="text-[#D4D4CF]" />
          )}
        </span>
        <span className="w-5 flex justify-center">
          {them ? (
            <CheckCircle2 size={14} className="text-[#2563EB]" />
          ) : (
            <XCircle size={14} className="text-[#D4D4CF]" />
          )}
        </span>
      </div>
    </div>
  );
}

export default function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMy = searchParams.get("my") ?? "";
  const initialThem = searchParams.get("them") ?? "";

  const [myUrl, setMyUrl]   = useState(initialMy);
  const [themUrl, setThemUrl] = useState(initialThem);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const runComparison = useCallback(async (my: string, them: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/public/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myUrl: my, competitorUrl: them }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Comparison failed.");
      setResult(data as CompareResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't complete this comparison. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run if both URLs are in query params
  useEffect(() => {
    if (initialMy && initialThem) {
      runComparison(initialMy, initialThem);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!myUrl.trim() || !themUrl.trim()) return;
    // Update URL so result is shareable
    const params = new URLSearchParams({ my: myUrl.trim(), them: themUrl.trim() });
    router.replace(`/compare?${params.toString()}`);
    runComparison(myUrl.trim(), themUrl.trim());
  }

  /** Build the "Show Me How to Beat Them" URL — preserves my/them through auth */
  function buildSignupUrl(): string {
    const my = result?.mine.domain ?? myUrl;
    const them = result?.them.domain ?? themUrl;
    const next = `/dashboard?my=${encodeURIComponent(my)}&them=${encodeURIComponent(them)}`;
    return `/signup?next=${encodeURIComponent(next)}&my=${encodeURIComponent(my)}&them=${encodeURIComponent(them)}`;
  }

  const myScore = result?.mine.aiReadinessScore ?? 0;
  const themScore = result?.them.aiReadinessScore ?? 0;
  const myWins = myScore >= themScore;
  const themWins = themScore > myScore;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E1] px-4 py-4">
        <div className="max-w-[780px] mx-auto flex items-center justify-between">
          <Link href="/" className="text-[14px] font-black text-[#171717] tracking-tight">
            Customers<span className="text-[#0866F5]">.</span>Direct
          </Link>
          <Link href="/signup" className="text-[13px] font-semibold text-[#0866F5] hover:underline">
            Sign up free →
          </Link>
        </div>
      </div>

      <div className="max-w-[780px] mx-auto px-4 py-12">

        {/* Eyebrow */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] px-3 py-1 rounded-full uppercase tracking-wider mb-4">
            AI Visibility Platform
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] leading-[1.15] tracking-tight mb-3">
            See who AI recommends.
            <br />
            <span className="text-[#0866F5]">You or your competitor?</span>
          </h1>
          <p className="text-[15px] text-[#777773]">
            Compare your website against a competitor in AI search.
          </p>
        </div>

        {/* Comparison bar */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-white border border-[#E5E5E1] rounded-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-sm">
            <input
              type="text"
              value={myUrl}
              onChange={(e) => setMyUrl(e.target.value)}
              placeholder="yourbusiness.com"
              className="flex-1 px-4 py-3 text-[14px] text-[#171717] placeholder:text-[#A3A3A0] bg-transparent focus:outline-none"
              disabled={loading}
            />
            <div className="hidden sm:flex items-center justify-center px-2">
              <span className="text-[11px] font-bold text-[#A3A3A0] bg-[#F0F0EC] rounded-full px-2.5 py-1">
                VS
              </span>
            </div>
            <input
              type="text"
              value={themUrl}
              onChange={(e) => setThemUrl(e.target.value)}
              placeholder="competitor.com"
              className="flex-1 px-4 py-3 text-[14px] text-[#171717] placeholder:text-[#A3A3A0] bg-transparent focus:outline-none border-t sm:border-t-0 sm:border-l border-[#F0F0EC]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !myUrl.trim() || !themUrl.trim()}
              className="flex items-center justify-center gap-2 bg-[#0866F5] hover:bg-[#0757D4] text-white text-[13.5px] font-bold px-5 py-3 rounded-xl transition-colors disabled:opacity-60 shrink-0 active:scale-[0.97]"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Comparing…</>
              ) : (
                <>Compare Free <ArrowRight size={14} /></>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-[13px] text-[#991B1B] bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </form>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-[#0866F5]/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 size={22} className="animate-spin text-[#0866F5]" />
            </div>
            <p className="text-[15px] font-semibold text-[#171717] mb-1">Comparing AI visibility…</p>
            <p className="text-[13px] text-[#A3A3A0]">Analyzing both websites. This takes about 10 seconds.</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="flex flex-col gap-6">

            {/* Verdict banner */}
            <div className={`rounded-2xl px-6 py-5 text-center ${
              result.leader === "competitor"
                ? "bg-[#FEF2F2] border border-red-100"
                : result.leader === "you"
                ? "bg-[#F0FDF4] border border-green-100"
                : "bg-[#F5F5F2] border border-[#E5E5E1]"
            }`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {result.leader === "competitor" ? (
                  <TrendingDown size={18} className="text-[#DC2626]" />
                ) : result.leader === "you" ? (
                  <TrendingUp size={18} className="text-[#16A34A]" />
                ) : (
                  <Minus size={18} className="text-[#777773]" />
                )}
                <p className={`text-[16px] font-bold ${
                  result.leader === "competitor" ? "text-[#DC2626]"
                  : result.leader === "you" ? "text-[#16A34A]"
                  : "text-[#171717]"
                }`}>
                  {result.leader === "competitor"
                    ? "Your Competitor Is Winning"
                    : result.leader === "you"
                    ? "You Have the Advantage"
                    : "You're Neck and Neck"}
                </p>
              </div>
              <p className="text-[13px] text-[#777773]">
                {result.leader === "tie"
                  ? "Both sites have similar AI readiness — a full scan reveals the real gap."
                  : `${result.leader === "competitor" ? "They lead" : "You lead"} by ${Math.abs(result.diff)} readiness points based on website analysis.`}
              </p>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Your Website", domain: result.mine.domain, score: myScore, wins: myWins, accessible: result.mine.accessible },
                { label: "Competitor", domain: result.them.domain, score: themScore, wins: themWins, accessible: result.them.accessible },
              ].map(({ label, domain, score, wins, accessible }) => (
                <div
                  key={domain}
                  className={`bg-white rounded-2xl border p-5 ${
                    wins ? "border-[#2563EB]/30 ring-1 ring-[#2563EB]/20" : "border-[#E5E5E1]"
                  }`}
                >
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1">
                    {label}
                  </p>
                  <p className="text-[13px] font-semibold text-[#171717] mb-3 truncate">{domain}</p>
                  {!accessible ? (
                    <p className="text-[12px] text-[#A3A3A0] italic">Website unreachable</p>
                  ) : (
                    <>
                      <div className="text-[32px] font-black text-[#171717] leading-none mb-1">
                        {score}<span className="text-[16px] font-bold text-[#A3A3A0]">%</span>
                      </div>
                      <p className="text-[11px] text-[#A3A3A0] mb-3">AI Readiness Score</p>
                      <ScoreBar score={score} isWinner={wins} />
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Signal breakdown */}
            {(result.mine.accessible || result.them.accessible) && (
              <div className="bg-white border border-[#E5E5E1] rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-4">
                  Signal Breakdown
                </p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11.5px] text-[#A3A3A0]">Signal</span>
                  <div className="flex items-center gap-8">
                    <span className="text-[11px] font-semibold text-[#171717] w-5 text-center truncate">
                      {result.mine.domain.split(".")[0]}
                    </span>
                    <span className="text-[11px] font-semibold text-[#171717] w-5 text-center truncate">
                      {result.them.domain.split(".")[0]}
                    </span>
                  </div>
                </div>
                <MetricRow label="Structured data / Schema" mine={result.mine.schemaTypes.length > 0} them={result.them.schemaTypes.length > 0} />
                <MetricRow label="Local business markup" mine={result.mine.hasLocalBusiness} them={result.them.hasLocalBusiness} />
                <MetricRow label="Meta description" mine={result.mine.description.length > 50} them={result.them.description.length > 50} />
                <MetricRow label="Phone number" mine={result.mine.hasPhone} them={result.them.hasPhone} />
                <MetricRow label="Address / location" mine={result.mine.hasAddress} them={result.them.hasAddress} />
                <MetricRow label="Contact / booking form" mine={result.mine.hasContactForm} them={result.them.hasContactForm} />
                <MetricRow label="Reviews / testimonials" mine={result.mine.hasReviews} them={result.them.hasReviews} />
              </div>
            )}

            {/* Insights */}
            {result.insights.length > 0 && (
              <div className="bg-white border border-[#E5E5E1] rounded-2xl p-5">
                <p className="text-[13px] font-bold text-[#171717] mb-3">
                  {result.leader === "competitor"
                    ? "Why they may be winning"
                    : result.leader === "you"
                    ? "Why you have the edge"
                    : "Key observations"}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {result.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#555552]">
                      <ChevronRight size={14} className="text-[#A3A3A0] mt-[2px] shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#0866F5] to-[#4F46E5] rounded-2xl p-6 text-center text-white">
              <p className="text-[13px] font-semibold text-white/70 mb-1">
                This is just the surface. A full AI scan reveals:
              </p>
              <p className="text-[17px] font-bold mb-1">
                Exactly where AI recommends your competitor — not you
              </p>
              <p className="text-[13px] text-white/70 mb-5">
                Real ChatGPT, Claude, Perplexity, and Gemini scan results. Specific fix prompts for Claude.
              </p>
              <Link
                href={buildSignupUrl()}
                className="inline-flex items-center gap-2 bg-white text-[#0866F5] text-[14px] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors active:scale-[0.97] shadow-lg"
              >
                Show Me How to Beat Them
                <ArrowRight size={15} />
              </Link>
              <p className="text-[11px] text-white/50 mt-3">Free during beta · No credit card required</p>
            </div>

            {/* Score explanation */}
            <p className="text-[11px] text-[#A3A3A0] text-center leading-relaxed">
              AI Readiness Score is based on website signals — structured data, content depth, business markup, and contact signals —
              that AI platforms use when deciding which businesses to recommend.
              Full AI visibility scans (ChatGPT / Claude / Perplexity / Gemini) are available after signup.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
