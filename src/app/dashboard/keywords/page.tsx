import { redirect } from "next/navigation";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, EmptyState } from "@/components/geo/dashboard/ui";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { getSeoKeywords } from "@/lib/seo/dashboard-data";

export const metadata = { title: "Keywords", robots: { index: false } };

function PositionChange({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null || current === previous) {
    return <Minus size={13} className="text-[#CBD5E1]" aria-label="No change" />;
  }
  const improved = current < previous; // lower position number = better rank
  const delta = Math.abs(current - previous);
  return improved ? (
    <span className="inline-flex items-center gap-0.5 text-[#16A34A] text-xs font-bold">
      <ArrowUp size={12} /> {delta}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-[#DC2626] text-xs font-bold">
      <ArrowDown size={12} /> {delta}
    </span>
  );
}

export default async function KeywordsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const keywords = await getSeoKeywords(business.id, 150);

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">Keywords</h1>
      <p className="text-sm text-[#64748B] mb-6">Keywords your site ranks for in Google organic search.</p>

      <Card className="p-0 overflow-hidden">
        {keywords.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No keyword data yet"
              body="Run an SEO scan from the SEO Overview page to see what your site ranks for."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                  <th className="px-5 py-3">Keyword</th>
                  <th className="px-5 py-3">Volume</th>
                  <th className="px-5 py-3">Position</th>
                  <th className="px-5 py-3">Change</th>
                  <th className="px-5 py-3">Difficulty</th>
                  <th className="px-5 py-3">Ranking page</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k) => (
                  <tr key={k.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-[#0F172A]">{k.keyword}</td>
                    <td className="px-5 py-3 text-[#475569]">{k.search_volume != null ? k.search_volume.toLocaleString() : "—"}</td>
                    <td className="px-5 py-3 text-[#475569]">{k.current_position ?? "—"}</td>
                    <td className="px-5 py-3">
                      <PositionChange current={k.current_position} previous={k.previous_position} />
                    </td>
                    <td className="px-5 py-3 text-[#475569]">{k.difficulty ?? "—"}</td>
                    <td className="px-5 py-3 text-[#94A3B8] truncate max-w-[240px]">
                      {k.ranking_url ? (
                        <a href={k.ranking_url} target="_blank" rel="noreferrer" className="hover:text-[#2563EB]">
                          {k.ranking_url.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
