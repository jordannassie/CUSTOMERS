import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, EmptyState, StatCard } from "@/components/geo/dashboard/ui";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { getLatestSeoSnapshot, getReferringDomains } from "@/lib/seo/dashboard-data";

export const metadata = { title: "Backlinks", robots: { index: false } };

export default async function BacklinksPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [snapshot, referringDomains] = await Promise.all([
    getLatestSeoSnapshot(business.id),
    getReferringDomains(business.id, 30),
  ]);

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">Backlinks</h1>
      <p className="text-sm text-[#64748B] mb-6">
        Sites linking to you — the strongest signal search engines use to trust your site.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <StatCard
          label="Referring Domains"
          value={snapshot?.referring_domains != null ? snapshot.referring_domains.toLocaleString() : "—"}
          hint="unique domains linking to you"
        />
        <StatCard
          label="Total Backlinks"
          value={snapshot?.backlinks != null ? snapshot.backlinks.toLocaleString() : "—"}
          hint="individual linking pages"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {referringDomains.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No backlink data yet"
              body="Run an SEO scan from the SEO Overview page to see who links to you."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Backlinks</th>
                  <th className="px-5 py-3">Domain Rank</th>
                  <th className="px-5 py-3">First seen</th>
                </tr>
              </thead>
              <tbody>
                {referringDomains.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-[#0F172A] flex items-center gap-2">
                      <Link2 size={13} className="text-[#94A3B8]" aria-hidden="true" />
                      {d.domain}
                    </td>
                    <td className="px-5 py-3 text-[#475569]">{d.backlinks ?? "—"}</td>
                    <td className="px-5 py-3 text-[#475569]">{d.domain_rank ?? "—"}</td>
                    <td className="px-5 py-3 text-[#94A3B8]">{d.first_seen ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-[#94A3B8] mt-6 max-w-2xl">
        Competitor backlink-gap analysis (domains that link to your tracked competitors but not to you) is on the
        roadmap — this page currently shows your own backlink profile.
      </p>
    </DashboardShell>
  );
}
