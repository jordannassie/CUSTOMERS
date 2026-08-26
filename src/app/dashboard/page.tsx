import Link from "next/link";
import {
  ArrowRight, Bot, BarChart2, TrendingUp, TrendingDown,
  Lightbulb, CheckCircle2, Globe, MapPin, Pencil,
  Search, ShieldCheck, Quote,
} from "lucide-react";
import OnboardingWizard from "@/components/geo/OnboardingWizard";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import CompetitorTrendChart from "@/components/geo/dashboard/CompetitorTrendChart";
import RunScanButton from "@/components/geo/dashboard/RunScanButton";
import CompetitorLeaderboard from "@/components/geo/dashboard/CompetitorLeaderboard";
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
  const { overview, trendSeries, models, competitors, citations, results, hasAnyRun } = agg;

  // Opportunities + Agent Readiness — fetch separately
  const { createClient } = await import("@/lib/supabase/server");
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = await createClient();
  const service = createServiceClient();

  const [{ data: oppsData }, { data: agentScan }, { data: seoSnapshot }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, title, description, evidence, impact, status, category, claude_prompt, affected_url")
      .eq("business_id", business.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
    service
      .from("agent_readiness_scans")
      .select("readiness_score, readiness_status, webmcp_detected, webmcp_tool_count, actions_detected, actions_ready, completed_at")
      .eq("business_id", business.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("seo_snapshots")
      .select("id, fetched_at")
      .eq("business_id", business.id)
      .maybeSingle(),
  ]);

  const openOpps = oppsData ?? [];
  const {
    directScore, directScoreDelta,
    mentionRate, mentionRateDelta,
    shareOfVoice, shareOfVoiceDelta,
    promptsWon, promptsTested,
    totalCitations, uniqueSources, ownPageCitations,
    marketRank, marketTotal,
  } = overview;

  function deltaLabel(n: number | null, suffix = ""): string | undefined {
    if (n == null) return undefined;
    return `${n > 0 ? "+" : ""}${n}${suffix}`;
  }
  function trendDir(n: number | null): "up" | "down" | "flat" | undefined {
    if (n == null) return undefined;
    return n > 0 ? "up" : n < 0 ? "down" : "flat";
  }

  // Citation competitor gap count (sources citing competitors but not the business's own domain)
  const competitorCitationGaps = citations.filter(
    (c) => !c.isOwn && c.count > 0
  ).length;

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
      fullBleed
    >
      {/* ── Business identity header ────────────────────────────────────────── */}
      {/*
        RunScanButton MUST stay outside the Link — a <button> nested inside <a>
        is invalid HTML and causes button clicks to bubble to the Link (→ Settings).
      */}
      <div className="flex items-center gap-4 px-5 sm:px-7 py-4 bg-white border-b border-[#E5E5E1]">
        <Link
          href="/dashboard/settings"
          className="group flex items-center gap-4 flex-1 min-w-0 hover:bg-[#F5F5F2] -mx-2 px-2 py-1 rounded-xl transition-colors"
          aria-label={`${business.name} — click to edit business settings`}
        >
          <div className="relative shrink-0">
            {business.logo_url ? (
              <div className="w-12 h-12 rounded-xl border border-[#E5E5E1] overflow-hidden bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <CompetitorAvatar name={business.name} size={48} className="rounded-xl" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold text-[#171717] leading-tight truncate">{business.name}</h1>
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-[#A3A3A0] group-hover:text-[#777773]">
                <Pencil size={9} /> Edit
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {business.industry && <span className="text-[12px] text-[#777773]">{business.industry}</span>}
              {business.domain && (
                <span className="flex items-center gap-1 text-[12px] text-[#A3A3A0]">
                  <Globe size={10} aria-hidden="true" />{business.domain}
                </span>
              )}
              {(business.primary_city || business.primary_region) && (
                <span className="flex items-center gap-1 text-[12px] text-[#A3A3A0]">
                  <MapPin size={10} aria-hidden="true" />
                  {[business.primary_city, business.primary_region].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </Link>
        {/* RunScanButton is sibling to the Link, never inside it */}
        <RunScanButton businessId={business.id} />
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      {agg.latestRunStatus === "failed" && (
        <div className="mx-5 sm:mx-7 mt-4 text-[13px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
          Last scan failed: {agg.latestRunError ?? "Unknown error."}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-7 py-5 space-y-5">

        {/* 1. KPI ROW ──────────────────────────────────────────────────────── */}
        {hasAnyRun ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="AI Visibility"
              value={mentionRate != null ? `${mentionRate}%` : "—"}
              sub={`${promptsWon ?? 0}/${promptsTested ?? 0} prompts`}
              deltaStr={deltaLabel(mentionRateDelta, "pp")}
              trend={trendDir(mentionRateDelta)}
              icon={<TrendingUp size={12} className="text-[#D4D4CF]" />}
            />
            <KpiCard
              label="Market Rank"
              value={marketRank != null ? `#${marketRank}` : "—"}
              sub={marketTotal != null ? `of ${marketTotal} tracked` : "add competitors"}
              icon={<BarChart2 size={12} className="text-[#D4D4CF]" />}
            />
            <KpiCard
              label="Share of Voice"
              value={shareOfVoice != null ? `${shareOfVoice}%` : "—"}
              sub="vs tracked competitors"
              deltaStr={deltaLabel(shareOfVoiceDelta, "pp")}
              trend={trendDir(shareOfVoiceDelta)}
              icon={<Quote size={12} className="text-[#D4D4CF]" />}
            />
            <KpiCard
              label="Direct Score"
              value={directScore != null ? `${directScore}` : "—"}
              sub="/ 100"
              deltaStr={deltaLabel(directScoreDelta, " pts")}
              trend={trendDir(directScoreDelta)}
              icon={<CheckCircle2 size={12} className="text-[#D4D4CF]" />}
            />
          </div>
        ) : (
          <EmptyState
            title="No visibility scan has run yet"
            body="Run your first scan to see AI Visibility, Market Rank, Share of Voice, and your Direct Score — built from real AI provider responses."
          />
        )}

        {/* 2. AI VISIBILITY vs COMPETITORS CHART ──────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#E5E5E1] p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-[13px] font-bold text-[#171717]">AI Visibility vs Competitors</h2>
              <p className="text-[11px] text-[#A3A3A0] mt-0.5">
                {trendSeries.length > 0
                  ? `${trendSeries.length} scan${trendSeries.length !== 1 ? "s" : ""} · How often each appears in AI answers`
                  : "Run scans to see your visibility trend against competitors"}
              </p>
            </div>
            <Link
              href="/dashboard/visibility"
              className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
            >
              Full report <ArrowRight size={11} />
            </Link>
          </div>
          <CompetitorTrendChart
            businessName={business.name}
            trendSeries={trendSeries}
            competitors={competitors}
          />
        </div>

        {/* 3. COMPETITIVE LEADERBOARD ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
          <CompetitorLeaderboard
            business={{ id: business.id, name: business.name }}
            mentionRate={mentionRate}
            competitors={competitors}
            totalResults={results.length}
          />
        </div>

        {/* 4. THREE INSIGHT CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Search Intelligence */}
          <InsightCard
            icon={<Search size={15} className="text-[#2563EB]" />}
            title="Search Intelligence"
            href="/dashboard/seo"
            ctaLabel="View SEO"
            status={
              seoSnapshot
                ? { label: "Analysis available", sub: `Last run ${new Date(seoSnapshot.fetched_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, color: "text-emerald-600" }
                : { label: "Not yet analyzed", sub: "See keywords, rankings & competitor gaps", color: "text-[#777773]" }
            }
            ctaSecondary={!seoSnapshot ? { label: "Run Analysis", href: "/dashboard/seo" } : undefined}
          />

          {/* Sources & Citations */}
          <InsightCard
            icon={<Quote size={15} className="text-[#8B5CF6]" />}
            title="Sources & Citations"
            href="/dashboard/citations"
            ctaLabel="View Sources"
            status={
              totalCitations > 0
                ? {
                    label: `${competitorCitationGaps} source${competitorCitationGaps !== 1 ? "s" : ""} that could cite you`,
                    sub: `${totalCitations} total citations · ${uniqueSources} sources · ${ownPageCitations} from your site`,
                    color: competitorCitationGaps > 0 ? "text-amber-600" : "text-emerald-600",
                  }
                : { label: "No citation data yet", sub: "Run a scan to discover your source coverage", color: "text-[#777773]" }
            }
          />

          {/* AI Agent Readiness */}
          <InsightCard
            icon={<ShieldCheck size={15} className="text-[#0066FF]" />}
            title="AI Agent Readiness"
            badge="New"
            href="/dashboard/agent-readiness"
            ctaLabel="View Readiness"
            status={
              agentScan
                ? {
                    label: agentScan.readiness_status === "agent_ready" ? "Agent Ready"
                      : agentScan.readiness_status === "partially_ready" ? "Partially Ready"
                      : agentScan.readiness_status === "needs_work" ? "Needs Work"
                      : "Not Ready",
                    sub: `${agentScan.actions_ready}/${agentScan.actions_detected} actions ready · WebMCP ${agentScan.webmcp_detected ? "detected" : "not detected"}`,
                    color: agentScan.readiness_status === "agent_ready" ? "text-emerald-600"
                      : agentScan.readiness_status === "partially_ready" ? "text-amber-600"
                      : "text-orange-600",
                  }
                : { label: "Not yet scanned", sub: "Check whether AI agents can use your website", color: "text-[#777773]" }
            }
            ctaSecondary={!agentScan ? { label: "Scan Website", href: "/dashboard/agent-readiness" } : undefined}
          />
        </div>

        {/* 5. OPPORTUNITIES ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEA]">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-[#F59E0B]" />
              <h2 className="text-[13px] font-bold text-[#171717]">Top Opportunities</h2>
              {openOpps.length > 0 && (
                <span className="text-[10px] font-bold bg-[#F59E0B] text-white px-1.5 py-0.5 rounded-full">{openOpps.length}</span>
              )}
            </div>
            {openOpps.length > 0 && (
              <Link href="/dashboard/opportunities" className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            )}
          </div>
          {openOpps.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-[12px] text-[#A3A3A0]">
                {hasAnyRun ? "No open opportunities. Great job!" : "Run a scan to generate opportunities."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EEEEEA]">
              {openOpps.map((o) => (
                <div key={o.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#FAFAF8] group transition-colors">
                  <ImpactBadge impact={o.impact} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] text-[#171717] leading-snug font-medium">{o.title}</p>
                    {o.evidence && <p className="text-[11px] text-[#A3A3A0] mt-0.5 line-clamp-1">{o.evidence}</p>}
                  </div>
                  {o.claude_prompt && (
                    <Link
                      href={`/dashboard/direct-agent?q=${encodeURIComponent(o.claude_prompt.slice(0, 400))}`}
                      className="hidden group-hover:flex items-center gap-1 text-[11px] font-semibold text-[#7C3AED] shrink-0"
                    >
                      <Bot size={10} /> Ask Claude
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. DIRECT AGENT QUICK LINKS ────────────────────────────────────── */}
        {hasAnyRun && (
          <div className="bg-white rounded-xl border border-[#E5E5E1] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot size={14} className="text-[#A3A3A0]" />
                <h2 className="text-[13px] font-bold text-[#171717]">Direct Agent</h2>
              </div>
              <Link href="/dashboard/direct-agent" className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] flex items-center gap-1">
                Open <ArrowRight size={11} />
              </Link>
            </div>
            <p className="text-[11.5px] text-[#A3A3A0] mb-3">Ask anything about your AI visibility — grounded in your real data.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                "Why is my AI Visibility score what it is?",
                "What's the highest-impact fix right now?",
                "How do I beat my top competitor?",
              ].map((q) => (
                <Link
                  key={q}
                  href={`/dashboard/direct-agent?q=${encodeURIComponent(q)}`}
                  className="flex items-start gap-2 border border-[#E5E5E1] bg-white rounded-lg px-3 py-2.5 text-[#171717] hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-colors"
                >
                  <Bot size={12} className="text-[#A3A3A0] mt-0.5 shrink-0" />
                  <span className="text-[11.5px]">{q}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-7 py-3 border-t border-[#EEEEEA]">
        <p className="text-[10.5px] text-[#A3A3A0] max-w-3xl">
          AI Visibility, Share of Voice, and Direct Score are computed from real API responses from{" "}
          {models.length > 0
            ? models.map((m) => PROVIDER_LABELS[m.provider] ?? m.provider).join(", ")
            : "configured AI providers"}
          . Results may differ from live consumer sessions. Customers.Direct never guarantees AI rankings or mentions.
        </p>
      </div>
    </DashboardShell>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function KpiCard({
  label, value, sub, deltaStr, trend, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  deltaStr?: string;
  trend?: "up" | "down" | "flat";
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E1] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <p className="text-[22px] font-bold text-[#171717] leading-none">{value}</p>
        {sub && <p className="text-[11px] text-[#A3A3A0]">{sub}</p>}
      </div>
      {deltaStr && trend && (
        <p className={`text-[11px] font-semibold mt-1.5 flex items-center gap-0.5 ${
          trend === "up" ? "text-[#15803D]" : trend === "down" ? "text-[#DC2626]" : "text-[#A3A3A0]"
        }`}>
          {trend === "up" ? <TrendingUp size={10} /> : trend === "down" ? <TrendingDown size={10} /> : null}
          {deltaStr}
        </p>
      )}
    </div>
  );
}

function InsightCard({
  icon, title, badge, href, ctaLabel, status, ctaSecondary,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  href: string;
  ctaLabel: string;
  status: { label: string; sub?: string; color: string };
  ctaSecondary?: { label: string; href: string };
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E1] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[13px] font-bold text-[#171717]">{title}</span>
        {badge && (
          <span className="text-[9px] font-bold bg-[#0066FF] text-white px-1.5 py-0.5 rounded-full uppercase">{badge}</span>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-[12.5px] font-semibold ${status.color}`}>{status.label}</p>
        {status.sub && <p className="text-[11px] text-[#A3A3A0] mt-0.5 leading-relaxed">{status.sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={href} className="text-[12px] font-semibold text-[#171717] hover:text-[#0066FF] flex items-center gap-1 transition-colors">
          {ctaLabel} <ArrowRight size={11} />
        </Link>
        {ctaSecondary && (
          <Link href={ctaSecondary.href} className="text-[12px] font-semibold text-[#0066FF] flex items-center gap-1 hover:underline">
            {ctaSecondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
