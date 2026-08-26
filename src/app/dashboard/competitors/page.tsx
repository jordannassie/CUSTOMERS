import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card } from "@/components/geo/dashboard/ui";
import CompetitorsManager from "@/components/geo/dashboard/CompetitorsManager";
import { getPrimaryBusiness, getCompetitors } from "@/lib/geo/dashboard-data";
import { getLatestSeoSnapshot, getCompetitorSeoGaps } from "@/lib/seo/dashboard-data";

export const metadata = { title: "Competitors", robots: { index: false } };

export default async function CompetitorsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [competitors, snapshot, seoGaps] = await Promise.all([
    getCompetitors(business.id),
    getLatestSeoSnapshot(business.id),
    getCompetitorSeoGaps(business.id),
  ]);

  // One row per tracked competitor: how many keyword gaps we've found against
  // them, and the single biggest one by opportunity score. We don't fetch
  // each competitor's own total organic-keyword count in V1 (that would
  // multiply DataForSEO cost per competitor per scan) — see backlinks page
  // note and the session report for the same cost-control tradeoff.
  const gapsByCompetitor = new Map<string, typeof seoGaps>();
  for (const gap of seoGaps) {
    const list = gapsByCompetitor.get(gap.competitor_id) ?? [];
    list.push(gap);
    gapsByCompetitor.set(gap.competitor_id, list);
  }

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">Competitors</h1>
      <p className="text-sm text-[#64748B] mb-6">
        The businesses we compare your AI mentions and search visibility against.
      </p>

      <Card className="mb-6">
        <CompetitorsManager businessId={business.id} competitors={competitors} />
      </Card>

      {competitors.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[#0F172A]">SEO comparison</h2>
          </div>
          <p className="text-xs text-[#94A3B8] mb-4">
            You: {snapshot?.organic_keywords != null ? `${snapshot.organic_keywords.toLocaleString()} ranking keywords` : "no SEO scan yet"}
          </p>
          <div className="flex flex-col gap-3">
            {competitors.map((c) => {
              const gaps = gapsByCompetitor.get(c.id) ?? [];
              const topGap = gaps[0];
              return (
                <div key={c.id} className="border border-gray-100 rounded-xl px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm text-[#0F172A]">{c.name}</p>
                    {c.domain && <p className="text-xs text-[#94A3B8]">{c.domain}</p>}
                  </div>
                  <div className="text-xs text-[#475569] text-right">
                    {gaps.length > 0 ? (
                      <>
                        <p>
                          <span className="font-bold text-[#0F172A]">{gaps.length}</span> keyword gap{gaps.length === 1 ? "" : "s"} found
                        </p>
                        {topGap && (
                          <p className="text-[#94A3B8] mt-0.5">
                            Top gap: &ldquo;{topGap.keyword}&rdquo;
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[#94A3B8]">{c.domain ? "No SEO scan yet" : "No domain on file"}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
