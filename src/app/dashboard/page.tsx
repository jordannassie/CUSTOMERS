import Link from "next/link";
import {
  Target, Quote, Trophy, ArrowRight,
  Pencil, Globe, MapPin, Bot,
  BarChart2, TrendingUp, TrendingDown,
  Cpu, Lightbulb, CheckCircle2,
} from "lucide-react";
import OnboardingWizard from "@/components/geo/OnboardingWizard";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import ScoreTrendChart from "@/components/geo/dashboard/ScoreTrendChart";
import VisibilityMultiSeriesChart from "@/components/geo/dashboard/VisibilityMultiSeriesChart";
import RunScanButton from "@/components/geo/dashboard/RunScanButton";
import PromptPerformanceTable from "@/components/geo/dashboard/PromptPerformanceTable";
import CompetitorLeaderboard from "@/components/geo/dashboard/CompetitorLeaderboard";
import ModelVisibilityGrid from "@/components/geo/dashboard/ModelVisibilityGrid";
import YourCitedPages from "@/components/geo/dashboard/YourCitedPages";
import { EmptyState, ImpactBadge } from "@/components/geo/dashboard/ui";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { getDashboardAggregates, PROVIDER_LABELS } from "@/lib/geo/dashboard-aggregator";

export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const business = await getPrimaryBusiness();

  if (!business || business.status === "onboarding") {
    return <OnboardingWizard />;
  }

  const agg = await getDashboardAggregates(business.id);
  const { overview, history, models, competitors, citations, ownPages, results, hasAnyRun } = agg;

  // Opportunities — fetch separately (not in aggregator to keep it lean)
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: oppsData } = await supabase
    .from("opportunities")
    .select("id, title, description, evidence, impact, status, category, claude_prompt, affected_url")
    .eq("business_id", business.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(5);
  const openOpps = oppsData ?? [];

  const { directScore, directScoreDelta, mentionRate, mentionRateDelta,
    shareOfVoice, shareOfVoiceDelta, avgPosition, promptsWon, promptsTested,
    totalCitations, uniqueSources, ownPageCitations } = overview;

  // Helper for trend display
  function deltaLabel(n: number | null, suffix = ""): string | undefined {
    if (n == null) return undefined;
    return `${n > 0 ? "+" : ""}${n}${suffix}`;
  }
  function trendDir(n: number | null): "up" | "down" | "flat" | undefined {
    if (n == null) return undefined;
    return n > 0 ? "up" : n < 0 ? "down" : "flat";
  }

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
      fullBleed
    >
      {/* ── Business identity header ─────────────────────────────────────────── */}
      <Link
        href="/dashboard/settings"
        className="group flex items-center gap-4 px-5 sm:px-7 py-4 bg-white border-b border-[#E5E5E1] hover:bg-[#F5F5F2] transition-colors"
        aria-label={`${business.name} — click to edit business settings`}
      >
        <div className="relative shrink-0">
          {business.logo_url ? (
            <div className="w-14 h-14 rounded-xl border border-[#E5E5E1] overflow-hidden bg-white flex items-center justify-center"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <CompetitorAvatar name={business.name} size={56} className="rounded-xl" />
          )}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#171717] border-2 border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil size={9} className="text-white" aria-hidden="true" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-bold text-[#171717] leading-tight truncate">{business.name}</h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] px-2 py-0.5 rounded-full">
              <Pencil size={8} aria-hidden="true" /> Edit
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {business.industry && <span className="text-[12px] text-[#777773]">{business.industry}</span>}
            {business.domain && (
              <span className="flex items-center gap-1 text-[12px] text-[#A3A3A0]">
                <Globe size={11} aria-hidden="true" />{business.domain}
              </span>
            )}
            {(business.primary_city || business.primary_region) && (
              <span className="flex items-center gap-1 text-[12px] text-[#A3A3A0]">
                <MapPin size={11} aria-hidden="true" />
                {[business.primary_city, business.primary_region].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
        <ArrowRight size={16} className="text-[#D4D4CF] group-hover:text-[#777773] transition-colors shrink-0" aria-hidden="true" />
      </Link>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 sm:px-7 py-3 bg-white border-b border-[#E5E5E1] flex-wrap">
        <div className="flex items-center gap-1.5 bg-[#F5F5F2] border border-[#E5E5E1] rounded-lg px-3 py-1.5">
          <CompetitorAvatar name={business.name} size={14} />
          <span className="text-[12px] font-semibold text-[#171717]">{business.name}</span>
        </div>
        <RunScanButton businessId={business.id} />
        {hasAnyRun && directScore != null && (
          <div className="ml-auto flex items-center gap-4 text-[11.5px]">
            <span className="text-[#777773]">
              Direct Score: <strong className="text-[#171717]">{directScore}/100</strong>
              {directScoreDelta != null && (
                <span className={directScoreDelta >= 0 ? "text-[#15803D] ml-1" : "text-[#DC2626] ml-1"}>
                  {directScoreDelta >= 0 ? "↑" : "↓"}{Math.abs(directScoreDelta)} pts
                </span>
              )}
            </span>
            {mentionRate != null && (
              <span className="hidden sm:inline text-[#777773]">
                Visibility: <strong className="text-[#171717]">{mentionRate}%</strong>
                {mentionRateDelta != null && (
                  <span className={mentionRateDelta >= 0 ? "text-[#15803D] ml-1" : "text-[#DC2626] ml-1"}>
                    {mentionRateDelta >= 0 ? "↑" : "↓"}{Math.abs(mentionRateDelta)}pp
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      {agg.latestRunStatus === "failed" && (
        <div className="mx-5 sm:mx-7 mt-4 text-[13px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
          Last scan failed: {agg.latestRunError ?? "Unknown error."}
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Centre column ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 px-5 sm:px-7 py-5 border-r border-[#EEEEEA] overflow-x-hidden">

          {/* Section label */}
          <p className="text-[12.5px] text-[#777773] mb-4">
            <span className="font-semibold text-[#171717]">Overview</span>
            {directScoreDelta != null && (
              <>
                {" "}· Visibility is{" "}
                <span className={directScoreDelta >= 0 ? "text-[#15803D] font-semibold" : "text-[#DC2626] font-semibold"}>
                  {directScoreDelta >= 0 ? "up" : "down"} {Math.abs(directScoreDelta)} pts
                </span>{" "}since last scan
              </>
            )}
            {!hasAnyRun && <> · Run your first scan to see results</>}
          </p>

          {/* ── KPI cards ─────────────────────────────────────────── */}
          {hasAnyRun && directScore != null && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: "Direct Score",
                  value: `${directScore}`,
                  sub: "/ 100",
                  icon: Target,
                  delta: directScoreDelta,
                  deltaStr: deltaLabel(directScoreDelta, " pts"),
                  trend: trendDir(directScoreDelta),
                },
                {
                  label: "AI Visibility",
                  value: mentionRate != null ? `${mentionRate}%` : "—",
                  sub: `${promptsWon ?? 0}/${promptsTested ?? 0} prompts`,
                  icon: TrendingUp,
                  delta: mentionRateDelta,
                  deltaStr: deltaLabel(mentionRateDelta, "pp"),
                  trend: trendDir(mentionRateDelta),
                },
                {
                  label: "Share of Voice",
                  value: shareOfVoice != null ? `${shareOfVoice}%` : "—",
                  sub: "vs tracked competitors",
                  icon: BarChart2,
                  delta: shareOfVoiceDelta,
                  deltaStr: deltaLabel(shareOfVoiceDelta, "pp"),
                  trend: trendDir(shareOfVoiceDelta),
                },
                {
                  label: "Avg. Position",
                  value: avgPosition != null ? `#${avgPosition}` : "—",
                  sub: avgPosition != null ? "when mentioned" : "not yet mentioned",
                  icon: Trophy,
                  delta: null,
                  deltaStr: undefined,
                  trend: undefined,
                },
              ].map(({ label, value, sub, icon: Icon, delta, deltaStr, trend }) => (
                <div key={label} className="bg-white rounded-xl border border-[#E5E5E1] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{label}</p>
                    <Icon size={12} className="text-[#D4D4CF]" aria-hidden="true" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-[22px] font-bold text-[#171717] leading-none">{value}</p>
                    <p className="text-[11px] text-[#A3A3A0]">{sub}</p>
                  </div>
                  {deltaStr && trend && (
                    <p className={`text-[11px] font-semibold mt-1 inline-flex items-center gap-0.5 ${
                      trend === "up" ? "text-[#15803D]" : trend === "down" ? "text-[#DC2626]" : "text-[#A3A3A0]"
                    }`}>
                      {trend === "up" ? <TrendingUp size={10} /> : trend === "down" ? <TrendingDown size={10} /> : null}
                      {deltaStr}
                    </p>
                  )}
                  {!deltaStr && delta === null && directScore != null && (
                    <p className="text-[10.5px] text-[#A3A3A0] mt-1">No previous period yet</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Visibility trend chart ─────────────────────────────── */}
          {hasAnyRun && history.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] p-5 mb-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-[13px] font-bold text-[#171717]">Visibility trend</h2>
                  <p className="text-[11px] text-[#A3A3A0] mt-0.5">{history.length} scan{history.length !== 1 ? "s" : ""}</p>
                </div>
                <Link
                  href="/dashboard/visibility"
                  className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
                >
                  Full report <ArrowRight size={11} />
                </Link>
              </div>
              {history.length >= 2 ? (
                <VisibilityMultiSeriesChart history={history} />
              ) : (
                <div className="mt-4">
                  <ScoreTrendChart history={history} />
                  <p className="text-[11px] text-[#A3A3A0] mt-2">Run one more scan to see your trend chart with toggles.</p>
                </div>
              )}
            </div>
          )}

          {!hasAnyRun && (
            <div className="mb-5">
              <EmptyState
                title="No visibility scan has run yet"
                body="Run your first scan to see your Direct Score, AI visibility %, share of voice, and opportunities — built from real AI provider responses."
              />
            </div>
          )}

          {/* ── Citation quick stats ───────────────────────────────── */}
          {totalCitations > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] mb-5 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#EEEEEA] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Quote size={13} className="text-[#A3A3A0]" />
                  <h2 className="text-[13px] font-bold text-[#171717]">Citations</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/direct-agent?q=${encodeURIComponent(
                      "How can I get cited by more high-quality sources in AI responses?"
                    )}`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#777773] hover:text-[#171717] transition-colors"
                  >
                    <Bot size={11} /> Ask why
                  </Link>
                  <Link
                    href="/dashboard/citations"
                    className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
                  >
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 divide-x divide-[#EEEEEA] px-0">
                {[
                  { label: "Total citations", value: `${totalCitations}` },
                  { label: "Unique sources",  value: `${uniqueSources}`  },
                  { label: "Your pages",      value: `${ownPageCitations}` },
                ].map(({ label, value }) => (
                  <div key={label} className="px-5 py-3 text-center">
                    <p className="text-[18px] font-bold text-[#171717]">{value}</p>
                    <p className="text-[10.5px] text-[#A3A3A0] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Top sources mini-table */}
              <div className="divide-y divide-[#EEEEEA] border-t border-[#EEEEEA]">
                {citations.slice(0, 5).map((c, i) => (
                  <div
                    key={c.domain}
                    className={`flex items-center justify-between px-5 py-2.5 hover:bg-[#F5F5F2] transition-colors ${c.isOwn ? "bg-[#F0FDF4]/40" : ""}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-[#A3A3A0] w-4 tabular-nums">{i + 1}</span>
                      <span className={`text-[12.5px] truncate ${c.isOwn ? "font-semibold text-[#166534]" : "text-[#171717]"}`}>
                        {c.domain}
                      </span>
                      {c.isOwn && (
                        <span className="text-[9px] font-bold text-[#10B981] uppercase tracking-wide shrink-0">You</span>
                      )}
                    </span>
                    <span className="text-[12px] font-bold text-[#171717] tabular-nums shrink-0 ml-2">
                      {c.count}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Prompt performance ──────────────────────────────────── */}
          {hasAnyRun && results.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EEEEEA]">
                <h2 className="text-[13px] font-bold text-[#171717]">Prompt performance</h2>
                <Link
                  href="/dashboard/prompts"
                  className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
                >
                  Manage <ArrowRight size={11} />
                </Link>
              </div>
              <div className="px-5 pt-4 pb-2">
                <PromptPerformanceTable results={results} />
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ─────────────────────────────────────────── */}
        <div className="hidden xl:flex flex-col w-[280px] shrink-0 overflow-y-auto bg-white">

          {/* ── Direct Agent CTA ──────────────────────────────────── */}
          {hasAnyRun && (
            <div className="border-b border-[#EEEEEA] px-5 py-4">
              <p className="text-[12px] font-bold text-[#171717] mb-1">Direct Agent</p>
              <p className="text-[10.5px] text-[#A3A3A0] mb-3">
                Ask anything about your AI visibility — grounded in your real data.
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  "Why is my Direct Score what it is?",
                  "What's the highest-impact fix right now?",
                  "How do I beat my top competitor?",
                ].map((q) => (
                  <Link
                    key={q}
                    href={`/dashboard/direct-agent?q=${encodeURIComponent(q)}`}
                    className="text-[11.5px] text-left border border-[#E5E5E1] bg-white rounded-lg px-3 py-2 text-[#171717] hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-colors flex items-start gap-1.5"
                  >
                    <Bot size={12} className="text-[#A3A3A0] mt-0.5 shrink-0" />
                    {q}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Competitor leaderboard ────────────────────────────── */}
          <CompetitorLeaderboard
            business={{ id: business.id, name: business.name }}
            mentionRate={mentionRate}
            competitors={competitors}
            totalResults={results.length}
          />

          {/* ── Model visibility grid ─────────────────────────────── */}
          {models.length > 0 && (
            <div className="border-b border-[#EEEEEA] px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold text-[#171717]">Models</p>
                <Cpu size={12} className="text-[#D4D4CF]" />
              </div>
              <ModelVisibilityGrid models={models} />
            </div>
          )}

          {/* ── Your cited pages ──────────────────────────────────── */}
          {(ownPages.length > 0 || business.domain) && (
            <div className="border-b border-[#EEEEEA] px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold text-[#171717]">Your cited pages</p>
                <Globe size={12} className="text-[#D4D4CF]" />
              </div>
              <YourCitedPages
                pages={ownPages}
                domain={business.domain}
                totalOwnCitations={overview.ownPageCitations}
              />
            </div>
          )}

          {/* ── Opportunities ─────────────────────────────────────── */}
          <div className="flex-1 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-[#171717]">Open Opportunities</p>
              <Lightbulb size={12} className="text-[#D4D4CF]" />
            </div>
            {openOpps.length === 0 ? (
              <p className="text-[11px] text-[#A3A3A0]">
                {hasAnyRun ? "No open opportunities." : "Run a scan first."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {openOpps.map((o) => (
                  <div key={o.id} className="flex items-start gap-2 group">
                    <ImpactBadge impact={o.impact} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] text-[#171717] leading-snug">{o.title}</p>
                      {o.claude_prompt && (
                        <Link
                          href={`/dashboard/direct-agent?q=${encodeURIComponent(o.claude_prompt.slice(0, 400))}`}
                          className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#7C3AED] mt-0.5"
                        >
                          <CheckCircle2 size={9} /> Fix with Claude
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {openOpps.length > 0 && (
              <Link
                href="/dashboard/opportunities"
                className="mt-3 text-[11.5px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
              >
                View all <ArrowRight size={11} />
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-7 py-3 border-t border-[#EEEEEA]">
        <p className="text-[10.5px] text-[#A3A3A0] max-w-3xl">
          Direct Score, AI Visibility %, Share of Voice, and Average Position are computed from real
          API responses from{" "}
          {models.length > 0
            ? models.map((m) => PROVIDER_LABELS[m.provider] ?? m.provider).join(", ")
            : "configured AI providers"}
          . Results may differ from live consumer sessions. Customers.Direct never guarantees
          AI rankings or mentions.
        </p>
      </div>
    </DashboardShell>
  );
}
