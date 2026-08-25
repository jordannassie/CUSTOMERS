import Link from "next/link";
import { ArrowRight, Target, Quote, Trophy, AlertCircle } from "lucide-react";
import OnboardingWizard from "@/components/geo/OnboardingWizard";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import ScoreTrendChart from "@/components/geo/dashboard/ScoreTrendChart";
import RunScanButton from "@/components/geo/dashboard/RunScanButton";
import { StatCard, EmptyState, ImpactBadge, Card } from "@/components/geo/dashboard/ui";
import {
  getPrimaryBusiness,
  getLatestScore,
  getScoreHistory,
  getOpportunities,
  getLatestRun,
  getTrackedPrompts,
  getCompetitors,
} from "@/lib/geo/dashboard-data";

export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const business = await getPrimaryBusiness();

  if (!business || business.status === "onboarding") {
    return <OnboardingWizard />;
  }

  const [latestScore, history, opportunities, latestRun, prompts, competitors] = await Promise.all([
    getLatestScore(business.id),
    getScoreHistory(business.id),
    getOpportunities(business.id),
    getLatestRun(business.id),
    getTrackedPrompts(business.id),
    getCompetitors(business.id),
  ]);

  const openOpportunities = opportunities.filter((o) => o.status === "open").slice(0, 3);
  const hasAnyRun = latestRun !== null;

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">Overview</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {business.name}
            {business.primary_city ? ` · ${business.primary_city}${business.primary_region ? `, ${business.primary_region}` : ""}` : ""}
          </p>
        </div>
        <RunScanButton businessId={business.id} />
      </div>

      {!hasAnyRun && (
        <EmptyState
          title="No visibility scan has run yet"
          body="Run your first scan to see your Direct Score, mentions, and opportunities — all built from real AI provider responses."
        />
      )}

      {latestRun?.status === "failed" && (
        <div className="flex items-start gap-2 text-sm text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl px-5 py-4 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Your last scan didn&apos;t complete: {latestRun.error ?? "Unknown error."} This usually means no AI
            provider is configured yet, or the provider API returned an error.
          </span>
        </div>
      )}

      {hasAnyRun && latestScore && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <StatCard label="Direct Score" value={`${latestScore.score}`} hint="out of 100" icon={Target} />
            <StatCard
              label="Prompts Won"
              value={`${latestScore.prompts_won ?? 0} / ${latestScore.prompts_tested ?? 0}`}
              hint="mentioned by AI"
              icon={Trophy}
            />
            <StatCard
              label="Citation Rate"
              value={`${Math.round((latestScore.citation_rate ?? 0) * 100)}%`}
              hint="responses citing your site"
              icon={Quote}
            />
          </div>

          <Card className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-[#0F172A]">Direct Score trend</h2>
              <span className="text-xs text-[#94A3B8]">Last {history.length} scans</span>
            </div>
            <ScoreTrendChart history={history} />
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <StatCard label="Tracked Prompts" value={`${prompts.length}`} />
        <StatCard label="Competitors Tracked" value={`${competitors.length}`} />
        <StatCard
          label="Open Opportunities"
          value={`${opportunities.filter((o) => o.status === "open").length}`}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0F172A]">Top opportunities</h2>
          <Link href="/dashboard/opportunities" className="text-sm font-semibold text-[#2563EB] flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {openOpportunities.length === 0 ? (
          <p className="text-sm text-[#64748B]">
            {hasAnyRun
              ? "No open opportunities right now — nice work, or run a new scan to check for fresh ones."
              : "Opportunities appear here after your first scan."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {openOpportunities.map((o) => (
              <div key={o.id} className="border border-gray-100 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="font-semibold text-sm text-[#0F172A]">{o.title}</span>
                  <ImpactBadge impact={o.impact} />
                </div>
                <p className="text-xs text-[#64748B]">{o.evidence}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-[#94A3B8] mt-6 max-w-2xl">
        Direct Score and results reflect the AI providers currently configured for your account, queried
        via their official APIs. Results can differ from what you&apos;d see in a live consumer chat session.
        Customers.Direct never guarantees AI rankings or mentions.
      </p>
    </DashboardShell>
  );
}
