import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Globe, TrendingUp, Link2, Award } from "lucide-react";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import RunSeoScanButton from "@/components/geo/dashboard/RunSeoScanButton";
import OpportunityCard from "@/components/geo/dashboard/OpportunityCard";
import { StatCard, EmptyState, Card } from "@/components/geo/dashboard/ui";
import { getPrimaryBusiness, getOpportunities, getCompetitors } from "@/lib/geo/dashboard-data";
import { getLatestSeoSnapshot, getLatestSeoRun, getCompetitorSeoGaps } from "@/lib/seo/dashboard-data";

export const metadata = { title: "SEO Overview", robots: { index: false } };

export default async function SeoOverviewPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [snapshot, latestRun, opportunities, competitorGaps, competitors] = await Promise.all([
    getLatestSeoSnapshot(business.id),
    getLatestSeoRun(business.id),
    getOpportunities(business.id),
    getCompetitorSeoGaps(business.id),
    getCompetitors(business.id),
  ]);

  const seoOpportunities = opportunities.filter((o) => o.source === "seo" && o.status === "open").slice(0, 3);
  const competitorNameById = new Map(competitors.map((c) => [c.id, c.name]));
  const topGap = competitorGaps[0];

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">SEO Overview</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Where customers can find you in traditional search — not just AI answers.
          </p>
        </div>
        <RunSeoScanButton businessId={business.id} />
      </div>

      {!snapshot && (
        <EmptyState
          title="No SEO analysis has run yet"
          body="Run your first SEO scan to see organic keywords, estimated traffic, competitor gaps, and referring domains — all from real search data."
        />
      )}

      {latestRun?.status === "failed" && (
        <div className="text-sm text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl px-5 py-4 mb-6">
          Your last SEO scan didn&apos;t fully complete: {latestRun.error ?? "Unknown error."} This usually means
          the DataForSEO connection isn&apos;t configured yet, or this business has no domain on file.
        </div>
      )}

      {snapshot && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <StatCard
            label="Organic Keywords"
            value={snapshot.organic_keywords != null ? snapshot.organic_keywords.toLocaleString() : "—"}
            hint="ranking in Google"
            icon={Globe}
          />
          <StatCard
            label="Est. Organic Traffic"
            value={snapshot.estimated_traffic != null ? snapshot.estimated_traffic.toLocaleString() : "—"}
            hint="visits/month"
            icon={TrendingUp}
          />
          <StatCard
            label="Referring Domains"
            value={snapshot.referring_domains != null ? snapshot.referring_domains.toLocaleString() : "—"}
            hint="linking to you"
            icon={Link2}
          />
          <StatCard
            label="Domain Rank"
            value={snapshot.domain_rank != null ? String(snapshot.domain_rank) : "—"}
            hint="authority equivalent"
            icon={Award}
          />
        </div>
      )}

      {topGap && (
        <Card className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-1">Biggest gap right now</p>
          <p className="text-sm text-[#0F172A]">
            <span className="font-bold">{competitorNameById.get(topGap.competitor_id) ?? "A tracked competitor"}</span>{" "}
            ranks #{topGap.competitor_position ?? "?"} for &ldquo;{topGap.keyword}&rdquo;
            {topGap.search_volume ? ` (${topGap.search_volume.toLocaleString()} searches/mo)` : ""} — you{" "}
            {topGap.business_position ? `rank #${topGap.business_position}` : "don't rank in the tracked results"}.
          </p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0F172A]">Top SEO opportunities</h2>
          <Link href="/dashboard/opportunities" className="text-sm font-semibold text-[#2563EB] flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {seoOpportunities.length === 0 ? (
          <p className="text-sm text-[#64748B]">
            {snapshot
              ? "No open SEO opportunities right now — run a new scan to check for fresh ones."
              : "SEO opportunities appear here after your first scan."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {seoOpportunities.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} businessId={business.id} />
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-[#94A3B8] mt-6 max-w-2xl">
        SEO data is provided by DataForSEO and reflects Google organic search. Estimates (traffic, traffic value,
        domain rank) are third-party modeled figures, not guarantees — Customers.Direct never promises specific
        rankings.
      </p>
    </DashboardShell>
  );
}
