import Link from "next/link";
import { Target, Quote, Trophy, Users, AlertCircle, ArrowRight, TrendingUp } from "lucide-react";
import OnboardingWizard from "@/components/geo/OnboardingWizard";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import ScoreTrendChart from "@/components/geo/dashboard/ScoreTrendChart";
import RunScanButton from "@/components/geo/dashboard/RunScanButton";
import PromptPerformanceTable from "@/components/geo/dashboard/PromptPerformanceTable";
import { MetricCard, EmptyState, ImpactBadge, Card } from "@/components/geo/dashboard/ui";
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

  const openOpportunities = opportunities.filter((o) => o.status === "open").slice(0, 3);
  const hasAnyRun = latestRun !== null;

  // Trend calculation — compare latest score to previous
  const prevScore = history.length >= 2 ? history[history.length - 2] : null;
  const scoreDelta = latestScore && prevScore ? latestScore.score - prevScore.score : null;
  const wonDelta =
    latestScore && prevScore
      ? (latestScore.prompts_won ?? 0) - (prevScore.prompts_won ?? 0)
      : null;
  const citDelta =
    latestScore && prevScore
      ? Math.round(((latestScore.citation_rate ?? 0) - (prevScore.citation_rate ?? 0)) * 100)
      : null;

  // Top sources from results
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
  const topSources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalMentions = results.filter((r) => r.business_mentioned).length;

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[18px] font-bold text-[#171717]">Dashboard</h1>
          <p className="text-[13px] text-[#777773] mt-0.5">
            AI search visibility overview for {business.name}
            {business.primary_city
              ? ` · ${business.primary_city}${business.primary_region ? `, ${business.primary_region}` : ""}`
              : ""}
          </p>
        </div>
        <RunScanButton businessId={business.id} />
      </div>

      {/* Error / empty states */}
      {!hasAnyRun && (
        <EmptyState
          title="No visibility scan has run yet"
          body="Run your first scan to see your Direct Score, mentions, and opportunities — built from real AI provider responses."
        />
      )}

      {latestRun?.status === "failed" && (
        <div className="flex items-start gap-2 text-[13px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 mb-5">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>
            Your last scan didn&apos;t complete: {latestRun.error ?? "Unknown error."} This usually
            means no AI provider is configured yet, or the provider API returned an error.
          </span>
        </div>
      )}

      {/* Metric cards — 4 columns */}
      {hasAnyRun && latestScore && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Direct Score"
            value={`${latestScore.score} / 100`}
            sub="vs. prior scan"
            icon={Target}
            trend={scoreDelta !== null ? (scoreDelta > 0 ? "up" : scoreDelta < 0 ? "down" : "flat") : undefined}
            trendLabel={scoreDelta !== null ? `${scoreDelta > 0 ? "+" : ""}${scoreDelta} pts` : undefined}
            sparkline={
              history.length >= 2 ? (
                <ScoreTrendChart history={history} compact />
              ) : undefined
            }
          />
          <MetricCard
            label="Prompts Won"
            value={`${latestScore.prompts_won ?? 0} / ${latestScore.prompts_tested ?? 0}`}
            sub={
              latestScore.prompts_tested
                ? `${Math.round(((latestScore.prompts_won ?? 0) / latestScore.prompts_tested) * 100)}% mentioned by AI`
                : "mentioned by AI"
            }
            icon={Trophy}
            trend={wonDelta !== null ? (wonDelta > 0 ? "up" : wonDelta < 0 ? "down" : "flat") : undefined}
            trendLabel={wonDelta !== null ? `${wonDelta > 0 ? "+" : ""}${wonDelta}` : undefined}
          />
          <MetricCard
            label="Citation Rate"
            value={`${Math.round((latestScore.citation_rate ?? 0) * 100)}%`}
            sub="responses citing your site"
            icon={Quote}
            trend={citDelta !== null ? (citDelta > 0 ? "up" : citDelta < 0 ? "down" : "flat") : undefined}
            trendLabel={citDelta !== null ? `${citDelta > 0 ? "+" : ""}${citDelta}%` : undefined}
          />
          <MetricCard
            label="Competitors Tracked"
            value={`${competitors.length}`}
            sub={`${openOpportunities.length} open opportunit${openOpportunities.length === 1 ? "y" : "ies"}`}
            icon={Users}
          />
        </div>
      )}

      {/* Second row — tracked prompts / stats */}
      {hasAnyRun && latestScore && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E5E5E1] px-4 py-3 text-center">
            <p className="text-[20px] font-bold text-[#171717]">{prompts.length}</p>
            <p className="text-[11px] text-[#A3A3A0] mt-0.5 uppercase tracking-wider font-semibold">Tracked prompts</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E5E1] px-4 py-3 text-center">
            <p className="text-[20px] font-bold text-[#171717]">{totalMentions}</p>
            <p className="text-[11px] text-[#A3A3A0] mt-0.5 uppercase tracking-wider font-semibold">Total mentions</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E5E1] px-4 py-3 text-center">
            <p className="text-[20px] font-bold text-[#171717]">
              {opportunities.filter((o) => o.status === "open").length}
            </p>
            <p className="text-[11px] text-[#A3A3A0] mt-0.5 uppercase tracking-wider font-semibold">Open opportunities</p>
          </div>
        </div>
      )}

      {/* Prompt performance table */}
      {hasAnyRun && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-bold text-[#171717] text-[15px]">Prompt performance</h2>
              <p className="text-[12px] text-[#A3A3A0] mt-0.5">
                How your business appears in AI-generated answers
              </p>
            </div>
            <Link
              href="/dashboard/prompts"
              className="text-[13px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
            >
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <PromptPerformanceTable results={results} />
        </Card>
      )}

      {/* Bottom 3-column section */}
      {hasAnyRun && latestScore && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Visibility trend */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-[#E5E5E1] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#171717] text-[14px]">Visibility trend</h2>
              <span className="text-[11px] text-[#A3A3A0]">Last {history.length} scans</span>
            </div>
            <ScoreTrendChart history={history} />
          </div>

          {/* Top sources */}
          <div className="bg-white rounded-xl border border-[#E5E5E1] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#171717] text-[14px]">Top sources mentioning you</h2>
              <Link
                href="/dashboard/citations"
                className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors"
              >
                View all
              </Link>
            </div>
            {topSources.length === 0 ? (
              <p className="text-[13px] text-[#A3A3A0]">No citation data yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topSources.map(([domain, count]) => {
                  const pct = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
                  return (
                    <div key={domain} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-[#F5F5F2] flex items-center justify-center shrink-0">
                        <TrendingUp size={10} className="text-[#A3A3A0]" aria-hidden="true" />
                      </div>
                      <span className="text-[13px] text-[#171717] truncate flex-1">{domain}</span>
                      <span className="text-[13px] font-semibold text-[#171717] tabular-nums">{count}</span>
                      <span className="text-[12px] text-[#A3A3A0] tabular-nums w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Opportunities */}
          <div className="bg-white rounded-xl border border-[#E5E5E1] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#171717] text-[14px]">Opportunities</h2>
              <Link
                href="/dashboard/opportunities"
                className="text-[12px] font-semibold text-[#777773] hover:text-[#171717] transition-colors"
              >
                View all
              </Link>
            </div>
            {openOpportunities.length === 0 ? (
              <p className="text-[13px] text-[#A3A3A0]">
                {hasAnyRun
                  ? "No open opportunities right now."
                  : "Opportunities appear after your first scan."}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {openOpportunities.map((o) => (
                  <div key={o.id} className="flex items-start gap-2.5">
                    <ImpactBadge impact={o.impact} />
                    <p className="text-[13px] text-[#171717] leading-snug flex-1">{o.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#A3A3A0] mt-6 max-w-2xl">
        Direct Score and results reflect the AI providers currently configured for your account,
        queried via their official APIs. Results can differ from what you&apos;d see in a live consumer
        chat session. Customers.Direct never guarantees AI rankings or mentions.
      </p>
    </DashboardShell>
  );
}
