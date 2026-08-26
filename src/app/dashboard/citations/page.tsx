import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, EmptyState } from "@/components/geo/dashboard/ui";
import { getPrimaryBusiness, getLatestRunResults } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Citations", robots: { index: false } };

export default async function CitationsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const results = await getLatestRunResults(business.id);

  const counts = new Map<string, number>();
  for (const r of results) {
    for (const source of r.cited_sources) {
      counts.set(source.url, (counts.get(source.url) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const ownDomainCount = business.domain
    ? sorted.filter(([url]) => url.includes(business.domain!)).length
    : 0;

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-[18px] font-bold text-[#171717] mb-1">Citations</h1>
      <p className="text-[13px] text-[#777773] mb-6">
        Sources cited across your latest visibility run — {ownDomainCount > 0 ? `including ${ownDomainCount} from your own domain.` : "your own domain wasn't cited in this run."}
      </p>

      {sorted.length === 0 ? (
        <EmptyState
          title="No citations yet"
          body="Citations appear here after a completed visibility scan, if the AI provider's response included source URLs."
        />
      ) : (
        <Card>
          <div className="flex flex-col divide-y divide-gray-100">
            {sorted.map(([url, count]) => (
              <div key={url} className="flex items-center justify-between gap-3 py-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm flex items-center gap-1.5 truncate ${
                    business.domain && url.includes(business.domain) ? "text-[#777773] font-semibold" : "text-[#777773]"
                  }`}
                >
                  <ExternalLink size={12} className="shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
                <span className="text-xs font-bold text-[#A3A3A0] shrink-0">{count}×</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
