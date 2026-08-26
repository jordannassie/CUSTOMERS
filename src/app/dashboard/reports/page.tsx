import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Download, Share2, TrendingUp, TrendingDown } from "lucide-react";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, EmptyState, PageHeader } from "@/components/geo/dashboard/ui";
import ScoreTrendChart from "@/components/geo/dashboard/ScoreTrendChart";
import {
  getPrimaryBusiness,
  getScoreHistory,
  getOpportunities,
  getLatestScore,
  getCompetitors,
} from "@/lib/geo/dashboard-data";

export const metadata = { title: "Reports", robots: { index: false } };

export default async function ReportsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [history, opportunities, latestScore, competitors] = await Promise.all([
    getScoreHistory(business.id, 24),
    getOpportunities(business.id),
    getLatestScore(business.id),
    getCompetitors(business.id),
  ]);

  const statusCounts = opportunities.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const prevScore = history.length >= 2 ? history[history.length - 2] : null;
  const scoreDelta = latestScore && prevScore ? latestScore.score - prevScore.score : null;

  return (
    <DashboardShell businessId={business.id} businessName={business.name} businessLogoUrl={business.logo_url} businessDomain={business.domain}>
      <PageHeader
        title="Reports"
        description="Visibility scan history and performance summary."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              title="Export coming soon"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#A3A3A0] border border-[#E5E5E1] rounded-lg px-3 py-2 cursor-not-allowed"
            >
              <Download size={13} />
              Export
            </button>
            <button
              type="button"
              disabled
              title="Sharing coming soon"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#A3A3A0] border border-[#E5E5E1] rounded-lg px-3 py-2 cursor-not-allowed"
            >
              <Share2 size={13} />
              Share
            </button>
          </div>
        }
      />

      {history.length === 0 ? (
        <EmptyState title="No scans yet" body="Reports build automatically as scans run." />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Summary cards */}
          {latestScore && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Current Score",
                  value: `${latestScore.score}`,
                  sub: "/ 100",
                  trend: scoreDelta,
                },
                {
                  label: "Prompts Won",
                  value: `${latestScore.prompts_won ?? 0}`,
                  sub: `of ${latestScore.prompts_tested ?? 0}`,
                  trend: null,
                },
                {
                  label: "Total Scans",
                  value: `${history.length}`,
                  sub: "completed",
                  trend: null,
                },
                {
                  label: "Competitors",
                  value: `${competitors.length}`,
                  sub: "tracked",
                  trend: null,
                },
              ].map(({ label, value, sub, trend }) => (
                <div key={label} className="bg-white rounded-xl border border-[#E5E5E1] p-4">
                  <p className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex items-end gap-1.5">
                    <p className="text-[18px] font-bold text-[#171717] leading-none">{value}</p>
                    <p className="text-[12px] text-[#A3A3A0] mb-0.5">{sub}</p>
                  </div>
                  {trend !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] font-bold mt-1 ${
                        trend > 0 ? "text-[#166534]" : trend < 0 ? "text-[#991B1B]" : "text-[#A3A3A0]"
                      }`}
                    >
                      {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : "—"}
                      {trend !== 0 && `${trend > 0 ? "+" : ""}${trend} pts`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Trend chart */}
          {history.length >= 2 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#171717] text-[15px]">Direct Score over time</h2>
                <span className="text-[11px] text-[#A3A3A0]">{history.length} scans</span>
              </div>
              <ScoreTrendChart history={history} />
            </Card>
          )}

          {/* Scan history table */}
          <Card>
            <h2 className="font-bold text-[#171717] text-[15px] mb-4">Scan history</h2>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#EEEEEA]">
                    <th className="text-left text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-5 py-2.5">Date</th>
                    <th className="text-right text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-4 py-2.5">Score</th>
                    <th className="text-right text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-4 py-2.5">Change</th>
                    <th className="text-right text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-5 py-2.5">Won</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...history].reverse().map((h, i, arr) => {
                    const prev = arr[i + 1];
                    const delta = prev ? h.score - prev.score : null;
                    return (
                      <tr key={h.id} className="hover:bg-[#F5F5F2] transition-colors">
                        <td className="px-5 py-3 text-[#777773]">
                          {new Date(h.calculated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#171717]">{h.score}</td>
                        <td className="px-4 py-3 text-right">
                          {delta !== null ? (
                            <span
                              className={`font-bold ${
                                delta > 0 ? "text-[#166534]" : delta < 0 ? "text-[#991B1B]" : "text-[#A3A3A0]"
                              }`}
                            >
                              {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                            </span>
                          ) : (
                            <span className="text-[#A3A3A0]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-[#777773]">
                          {h.prompts_won}/{h.prompts_tested}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Opportunities summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["open", "in_progress", "resolved", "dismissed"].map((status) => (
              <div key={status} className="bg-white rounded-xl border border-[#E5E5E1] p-4 text-center">
                <p className="text-[18px] font-bold text-[#171717] mb-1">{statusCounts[status] ?? 0}</p>
                <p className="text-[10px] text-[#A3A3A0] uppercase tracking-widest font-bold">
                  {status.replace("_", " ")}
                </p>
              </div>
            ))}
          </div>

          {/* White-label teaser */}
          <div className="bg-[#0F172A] rounded-xl p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#3B82F6] mb-2">
                  Agency & white-label — coming soon
                </p>
                <h3 className="text-[17px] font-bold text-white mb-2">
                  Share polished reports with your clients under your brand.
                </h3>
                <p className="text-[13px] text-slate-400 max-w-md">
                  Agencies will be able to generate branded PDF/web reports with their logo, colors, and client name — with Customers.Direct branding optionally hidden.
                </p>
              </div>
              <Link
                href="/book"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3B82F6] hover:text-white transition-colors shrink-0"
              >
                Interested? Book a call <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
