import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Target, Quote, Trophy, AlertCircle, ArrowRight,
  Calendar, Filter, Cpu, RefreshCw, Pencil, Globe, MapPin,
} from "lucide-react";
import OnboardingWizard from "@/components/geo/OnboardingWizard";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import ScoreTrendChart from "@/components/geo/dashboard/ScoreTrendChart";
import RunScanButton from "@/components/geo/dashboard/RunScanButton";
import PromptPerformanceTable from "@/components/geo/dashboard/PromptPerformanceTable";
import { EmptyState, ImpactBadge } from "@/components/geo/dashboard/ui";
import { DomainFavicon } from "@/components/DomainFavicon";
import { SourceTypeBadge } from "@/components/SourceTypeBadge";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import {
  getPrimaryBusiness,
  getLatestScore,
  getScoreHistory,
  getOpportunities,
  getLatestRun,
  getTrackedPrompts,
  getCompetitors,
  getLatestRunResults,
} from "@/lib/geo/dashboard-data";

export const metadata = { title: "Dashboard", robots: { index: false } };

function guessType(domain: string, ownDomain: string | null): string {
  if (ownDomain && domain.includes(ownDomain)) return "You";
  const ugc  = ["reddit.com","quora.com","yelp.com","tripadvisor.com","trustpilot.com","twitter.com","x.com","facebook.com"];
  const ref  = ["wikipedia.org","wikihow.com","britannica.com","crunchbase.com","gov"];
  const edit = ["techcrunch.com","forbes.com","wired.com","verge.com","zdnet.com","cnet.com","pcmag.com","gartner.com","hbr.org"];
  if (ugc.some(u => domain.includes(u))) return "UGC";
  if (ref.some(r => domain.includes(r))) return "Reference";
  if (edit.some(e => domain.includes(e))) return "Editorial";
  return "Citation";
}

export default async function DashboardPage() {
  const business = await getPrimaryBusiness();

  if (!business || business.status === "onboarding") {
    return <OnboardingWizard />;
  }

  const [latestScore, history, opportunities, latestRun, prompts, competitors, results] =
    await Promise.all([
      getLatestScore(business.id),
      getScoreHistory(business.id),
      getOpportunities(business.id),
      getLatestRun(business.id),
      getTrackedPrompts(business.id),
      getCompetitors(business.id),
      getLatestRunResults(business.id),
    ]);

  const openOpportunities = opportunities.filter((o) => o.status === "open").slice(0, 5);
  const hasAnyRun = latestRun !== null;

  // Deltas
  const prevScore = history.length >= 2 ? history[history.length - 2] : null;
  const scoreDelta = latestScore && prevScore ? latestScore.score - prevScore.score : null;
  const wonDelta   = latestScore && prevScore
    ? (latestScore.prompts_won ?? 0) - (prevScore.prompts_won ?? 0)
    : null;
  const citDelta   = latestScore && prevScore
    ? Math.round(((latestScore.citation_rate ?? 0) - (prevScore.citation_rate ?? 0)) * 100)
    : null;

  // Top sources by domain
  const sourceCounts = new Map<string, number>();
  for (const r of results) {
    for (const s of r.cited_sources) {
      try {
        const host = new URL(s.url).hostname.replace(/^www\./, "");
        sourceCounts.set(host, (sourceCounts.get(host) ?? 0) + 1);
      } catch {
        sourceCounts.set(s.url, (sourceCounts.get(s.url) ?? 0) + 1);
      }
    }
  }
  const totalCitations = Array.from(sourceCounts.values()).reduce((a, b) => a + b, 0);
  const topSources = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Mentions
  const totalMentions = results.filter((r) => r.business_mentioned).length;
  const mentionRate = results.length > 0 ? Math.round((totalMentions / results.length) * 100) : 0;
  const citationRate = Math.round((latestScore?.citation_rate ?? 0) * 100);

  // Domains by type breakdown
  const typeMap: Record<string, number> = {};
  for (const [domain, count] of topSources) {
    const t = guessType(domain, business.domain ?? null);
    typeMap[t] = (typeMap[t] ?? 0) + count;
  }
  const TYPE_COLORS: Record<string, string> = {
    UGC: "#3B82F6", Editorial: "#F59E0B", Reference: "#8B5CF6",
    You: "#10B981", Citation: "#06B6D4", Other: "#D4D4CF",
  };

  return (
    <DashboardShell businessId={business.id} businessName={business.name} fullBleed>

      {/* ── Business identity header ─────────────────────────────────────── */}
      <Link
        href="/dashboard/settings"
        className="group flex items-center gap-4 px-5 sm:px-7 py-4 bg-white border-b border-[#E5E5E1] hover:bg-[#F5F5F2] transition-colors"
        aria-label={`${business.name} — click to edit business settings`}
      >
        {/* Logo or avatar */}
        <div className="relative shrink-0">
          {business.logo_url ? (
            <div className="w-14 h-14 rounded-xl border border-[#E5E5E1] overflow-hidden bg-white flex items-center justify-center"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-full h-full object-contain p-1"
              />
            </div>
          ) : (
            <CompetitorAvatar name={business.name} size={56} className="rounded-xl" />
          )}
          {/* Edit badge */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#171717] border-2 border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil size={9} className="text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-bold text-[#171717] leading-tight truncate">
              {business.name}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] px-2 py-0.5 rounded-full">
              <Pencil size={8} aria-hidden="true" />
              Edit
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {business.industry && (
              <span className="text-[12px] text-[#777773]">{business.industry}</span>
            )}
            {business.domain && (
              <span className="flex items-center gap-1 text-[12px] text-[#A3A3A0]">
                <Globe size={11} aria-hidden="true" />
                {business.domain}
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

        {/* Right arrow hint */}
        <ArrowRight size={16} className="text-[#D4D4CF] group-hover:text-[#777773] transition-colors shrink-0" aria-hidden="true" />
      </Link>

      {/* ── Filter / top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 sm:px-7 py-3 bg-white border-b border-[#E5E5E1] flex-wrap">
        {/* Business pill */}
        <div className="flex items-center gap-1.5 bg-[#F5F5F2] border border-[#E5E5E1] rounded-lg px-3 py-1.5">
          <CompetitorAvatar name={business.name} size={14} />
          <span className="text-[12px] font-semibold text-[#171717]">{business.name}</span>
        </div>
        {/* Date pill */}
        <button className="flex items-center gap-1.5 border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-[11.5px] text-[#777773] hover:bg-[#F5F5F2] transition-colors">
          <Calendar size={11} aria-hidden="true" />
          Last 30 days
        </button>
        {/* Tags pill */}
        <button className="flex items-center gap-1.5 border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-[11.5px] text-[#777773] hover:bg-[#F5F5F2] transition-colors">
          <Filter size={11} aria-hidden="true" />
          All tags
        </button>
        {/* Model pill */}
        <button className="flex items-center gap-1.5 border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-[11.5px] text-[#777773] hover:bg-[#F5F5F2] transition-colors">
          <Cpu size={11} aria-hidden="true" />
          All Models
        </button>

        <RunScanButton businessId={business.id} />

        {/* Stats on the right */}
        {hasAnyRun && (
          <div className="ml-auto flex items-center gap-4 text-[11.5px] flex-wrap">
            <span className="text-[#777773]">
              Visibility:{" "}
              <strong className="text-[#171717]">
                {latestScore?.prompts_won ?? 0}/{latestScore?.prompts_tested ?? 0}
              </strong>{" "}
              {scoreDelta !== null && (
                <span className={scoreDelta >= 0 ? "text-[#15803D]" : "text-[#DC2626]"}>
                  {scoreDelta >= 0 ? "↑" : "↓"}
                </span>
              )}
            </span>
            <span className="text-[#777773]">
              Citation rate:{" "}
              <strong className="text-[#171717]">{citationRate}%</strong>{" "}
              {citDelta !== null && (
                <span className={citDelta >= 0 ? "text-[#15803D]" : "text-[#DC2626]"}>
                  {citDelta >= 0 ? "↑" : "↓"}
                </span>
              )}
            </span>
            <span className="text-[#777773]">
              Prompts:{" "}
              <strong className="text-[#171717]">{prompts.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Error/empty banners ──────────────────────────────────────────── */}
      {latestRun?.status === "failed" && (
        <div className="mx-5 sm:mx-7 mt-4 flex items-start gap-2 text-[13px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>Your last scan didn&apos;t complete: {latestRun.error ?? "Unknown error."}</span>
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Centre column ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0 px-5 sm:px-7 py-5 border-r border-[#EEEEEA] overflow-x-hidden">

          {/* Status bar + tabs */}
          <div className="mb-1">
            <p className="text-[12.5px] text-[#777773] mb-4">
              <span className="font-semibold text-[#171717]">Overview</span>
              {scoreDelta !== null && (
                <> · Your visibility {scoreDelta >= 0 ? "is up" : "is down"}{" "}
                  <span className={scoreDelta >= 0 ? "text-[#15803D] font-semibold" : "text-[#DC2626] font-semibold"}>
                    {Math.abs(scoreDelta)} pts
                  </span>{" "}since last scan</>
              )}
              {!hasAnyRun && <> · Run your first scan to see results</>}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-[#EEEEEA] mb-5 -mx-5 sm:-mx-7 px-5 sm:px-7">
            {["Visibility", "Sentiment", "Position"].map((t, i) => (
              <button
                key={t}
                className={`px-4 py-2 text-[12.5px] font-semibold border-b-2 transition-colors ${
                  i === 0
                    ? "border-[#171717] text-[#171717]"
                    : "border-transparent text-[#A3A3A0] hover:text-[#777773]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Metric cards row */}
          {hasAnyRun && latestScore && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: "Direct Score",
                  value: `${latestScore.score}`,
                  sub: "/ 100",
                  icon: Target,
                  delta: scoreDelta,
                  deltaLabel: scoreDelta !== null ? `${scoreDelta > 0 ? "+" : ""}${scoreDelta} pts` : undefined,
                },
                {
                  label: "Prompts Won",
                  value: `${latestScore.prompts_won ?? 0}`,
                  sub: `/ ${latestScore.prompts_tested ?? 0}`,
                  icon: Trophy,
                  delta: wonDelta,
                  deltaLabel: wonDelta !== null ? `${wonDelta > 0 ? "+" : ""}${wonDelta}` : undefined,
                },
                {
                  label: "Citation Rate",
                  value: `${citationRate}%`,
                  sub: "of responses",
                  icon: Quote,
                  delta: citDelta,
                  deltaLabel: citDelta !== null ? `${citDelta > 0 ? "+" : ""}${citDelta}%` : undefined,
                },
                {
                  label: "Mention Rate",
                  value: `${mentionRate}%`,
                  sub: `${totalMentions}/${results.length} prompts`,
                  icon: RefreshCw,
                  delta: null,
                  deltaLabel: undefined,
                },
              ].map(({ label, value, sub, icon: Icon, delta, deltaLabel }) => (
                <div key={label} className="bg-white rounded-xl border border-[#E5E5E1] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{label}</p>
                    <Icon size={12} className="text-[#D4D4CF]" aria-hidden="true" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-[22px] font-bold text-[#171717] leading-none">{value}</p>
                    <p className="text-[11px] text-[#A3A3A0]">{sub}</p>
                  </div>
                  {deltaLabel && (
                    <p className={`text-[11px] font-semibold mt-1 ${
                      delta !== null && delta >= 0 ? "text-[#15803D]" : "text-[#DC2626]"
                    }`}>
                      {delta !== null && delta >= 0 ? "↑" : "↓"} {deltaLabel}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Visibility trend chart */}
          {hasAnyRun && history.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[13px] font-bold text-[#171717]">Visibility trend</h2>
                  <p className="text-[11px] text-[#A3A3A0] mt-0.5">{history.length} scans</p>
                </div>
                <Link
                  href="/dashboard/visibility"
                  className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
                >
                  Full report <ArrowRight size={11} />
                </Link>
              </div>
              <ScoreTrendChart history={history} />
            </div>
          )}

          {!hasAnyRun && (
            <div className="mb-5">
              <EmptyState
                title="No visibility scan has run yet"
                body="Run your first scan to see your Direct Score, mentions, and opportunities — built from real AI provider responses."
              />
            </div>
          )}

          {/* Source table */}
          {topSources.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden mb-5">
              {/* Tabs */}
              <div className="flex items-center border-b border-[#EEEEEA] px-5">
                {["Domains", "Prompts"].map((t, i) => (
                  <button key={t} className={`px-3 py-2.5 text-[12px] font-semibold border-b-2 ${
                    i === 0 ? "border-[#171717] text-[#171717]" : "border-transparent text-[#A3A3A0]"
                  }`}>{t}</button>
                ))}
                <Link href="/dashboard/citations"
                  className="ml-auto text-[11.5px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              {/* Header */}
              <div className="grid items-center px-5 py-2 border-b border-[#EEEEEA] bg-[#FAFAF8]"
                style={{ gridTemplateColumns: "20px 1fr 100px 70px 80px" }}>
                {["#", "Domain", "Type", "Used", "Citations"].map(h => (
                  <span key={h} className="text-[9.5px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {/* Rows */}
              <div className="divide-y divide-[#EEEEEA]">
                {topSources.map(([domain, count], i) => {
                  const type = guessType(domain, business.domain ?? null);
                  const pct = totalCitations > 0 ? Math.round((count / totalCitations) * 100) : 0;
                  return (
                    <div key={domain}
                      className={`grid items-center px-5 py-2.5 hover:bg-[#F5F5F2] transition-colors ${type === "You" ? "bg-[#F0FDF4]/50" : ""}`}
                      style={{ gridTemplateColumns: "20px 1fr 100px 70px 80px" }}>
                      <span className="text-[11px] text-[#A3A3A0]">{i + 1}</span>
                      <span className="flex items-center gap-2 min-w-0">
                        <DomainFavicon domain={domain} size={13} />
                        <span className="text-[12.5px] text-[#171717] truncate">{domain}</span>
                      </span>
                      <SourceTypeBadge type={type} size="xs" />
                      <span className="text-[12px] text-[#777773]">{pct}%</span>
                      <span className="text-[12px] font-semibold text-[#171717]">{count}×</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt performance */}
          {hasAnyRun && results.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEEEEA]">
                <h2 className="text-[13px] font-bold text-[#171717]">Prompt performance</h2>
                <Link href="/dashboard/prompts"
                  className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1">
                  Manage <ArrowRight size={11} />
                </Link>
              </div>
              {/* px-5 pt-4 supplies the padding that PromptPerformanceTable's inner -mx-5 cancels out */}
              <div className="px-5 pt-4 pb-2">
                <PromptPerformanceTable results={results} />
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ──────────────────────────────────────────── */}
        <div className="hidden xl:flex flex-col w-[260px] shrink-0 overflow-y-auto bg-white">

          {/* Competitors section */}
          <div className="border-b border-[#EEEEEA]">
            <div className="px-5 pt-5 pb-3">
              <p className="text-[12px] font-bold text-[#171717]">Your competitors</p>
              <p className="text-[10.5px] text-[#A3A3A0] mt-0.5">Compare with AI results</p>
            </div>
            {/* Header */}
            <div className="grid items-center px-4 py-1.5 border-b border-[#EEEEEA] bg-[#FAFAF8]"
              style={{ gridTemplateColumns: "16px 1fr 44px 32px" }}>
              {["#", "Brand", "Vis.", "+/−"].map(h => (
                <span key={h} className="text-[8.5px] font-bold text-[#A3A3A0] uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {competitors.length === 0 ? (
              <div className="px-5 py-4 text-[11px] text-[#A3A3A0]">
                No competitors yet.{" "}
                <Link href="/dashboard/competitors" className="text-[#777773] underline">Add one →</Link>
              </div>
            ) : (
              <div className="divide-y divide-[#EEEEEA]">
                {competitors.slice(0, 6).map((c, i) => (
                  <div key={c.id}
                    className="grid items-center px-4 py-2.5 hover:bg-[#F5F5F2] transition-colors"
                    style={{ gridTemplateColumns: "16px 1fr 44px 32px" }}>
                    <span className="text-[10px] text-[#A3A3A0] font-semibold">{i + 1}</span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      <CompetitorAvatar name={c.name} size={16} />
                      <span className="text-[11px] font-semibold text-[#777773] truncate">{c.name}</span>
                    </span>
                    <span className="text-[10.5px] font-bold text-[#171717]">—</span>
                    <span className="text-[9.5px] text-[#A3A3A0]">—</span>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2.5 border-t border-[#EEEEEA]">
              <Link href="/dashboard/competitors"
                className="text-[11.5px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1">
                Manage competitors <ArrowRight size={11} />
              </Link>
            </div>
          </div>

          {/* Domains by Type */}
          {topSources.length > 0 && (
            <div className="border-b border-[#EEEEEA]">
              <div className="px-5 pt-4 pb-3">
                <p className="text-[12px] font-bold text-[#171717]">Domains by Type</p>
                <p className="text-[10.5px] text-[#A3A3A0] mt-0.5">Most cited, by category</p>
              </div>
              <div className="px-5 pb-4 flex flex-col gap-2">
                {Object.entries(typeMap).map(([type, count]) => {
                  const pct = totalCitations > 0 ? Math.round((count / totalCitations) * 100) : 0;
                  const color = TYPE_COLORS[type] ?? "#D4D4CF";
                  return (
                    <div key={type} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                      <span className="text-[11px] text-[#777773] flex-1">{type}</span>
                      <span className="text-[11px] font-bold text-[#171717] tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opportunities */}
          <div className="flex-1">
            <div className="px-5 pt-4 pb-3">
              <p className="text-[12px] font-bold text-[#171717]">Open Opportunities</p>
              <p className="text-[10.5px] text-[#A3A3A0] mt-0.5">Evidence-backed fixes</p>
            </div>
            {openOpportunities.length === 0 ? (
              <p className="px-5 text-[11px] text-[#A3A3A0]">
                {hasAnyRun ? "No open opportunities." : "Run a scan first."}
              </p>
            ) : (
              <div className="divide-y divide-[#EEEEEA]">
                {openOpportunities.map((o) => (
                  <div key={o.id} className="px-5 py-3 flex items-start gap-2.5">
                    <ImpactBadge impact={o.impact} />
                    <p className="text-[11.5px] text-[#171717] leading-snug flex-1">{o.title}</p>
                  </div>
                ))}
              </div>
            )}
            {openOpportunities.length > 0 && (
              <div className="px-5 py-3 border-t border-[#EEEEEA]">
                <Link href="/dashboard/opportunities"
                  className="text-[11.5px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Disclaimer */}
      <div className="px-5 sm:px-7 py-3 border-t border-[#EEEEEA]">
        <p className="text-[10.5px] text-[#A3A3A0] max-w-3xl">
          Direct Score and results reflect the AI providers currently configured for your account,
          queried via their official APIs. Results can differ from what you&apos;d see in a live consumer
          chat session. Customers.Direct never guarantees AI rankings or mentions.
        </p>
      </div>

    </DashboardShell>
  );
}
