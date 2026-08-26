import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { PlatformIcon } from "@/components/PlatformIcon";
import { Card, EmptyState, PageHeader } from "@/components/geo/dashboard/ui";
import ScoreTrendChart from "@/components/geo/dashboard/ScoreTrendChart";
import { getPrimaryBusiness, getLatestRun, getLatestRunResults, getScoreHistory } from "@/lib/geo/dashboard-data";

export const metadata = { title: "AI Insights", robots: { index: false } };

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  google_ai_overviews: "Google AI",
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10B981",
  anthropic: "#7C3AED",
  perplexity: "#2563EB",
  google_ai_overviews: "#FBBC04",
};

export default async function VisibilityPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [latestRun, results, history] = await Promise.all([
    getLatestRun(business.id),
    getLatestRunResults(business.id),
    getScoreHistory(business.id),
  ]);

  // Compute metrics
  const totalPrompts = results.length;
  const won = results.filter((r) => r.business_mentioned);
  const mentionRate = totalPrompts > 0 ? Math.round((won.length / totalPrompts) * 100) : 0;

  // Per-provider breakdown
  const providerMap = new Map<string, { won: number; total: number }>();
  for (const r of results) {
    const p = providerMap.get(r.provider) ?? { won: 0, total: 0 };
    p.total++;
    if (r.business_mentioned) p.won++;
    providerMap.set(r.provider, p);
  }

  // Citation count
  const allCitations = results.flatMap((r) => r.cited_sources);
  const ownCitations = business.domain
    ? allCitations.filter((s) => s.url.includes(business.domain!))
    : [];
  const citationRate = allCitations.length > 0
    ? Math.round((ownCitations.length / allCitations.length) * 100)
    : 0;

  // Position distribution
  const positionCounts = new Map<string, number>();
  for (const r of won) {
    const bucket = r.mention_position
      ? r.mention_position <= 1 ? "#1" : r.mention_position <= 3 ? "Top 3" : "Top 10"
      : "Mentioned";
    positionCounts.set(bucket, (positionCounts.get(bucket) ?? 0) + 1);
  }

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <PageHeader
        title="AI Insights"
        description={
          latestRun
            ? `Latest: ${PROVIDER_LABELS[latestRun.provider] ?? latestRun.provider} · ${new Date(latestRun.started_at).toLocaleDateString()} · ${latestRun.status}`
            : "No scans run yet"
        }
      />

      {results.length === 0 ? (
        <EmptyState
          title="No results yet"
          body="Run a scan from the Dashboard to see how AI providers respond to your tracked prompts."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Mention Rate",
                value: `${mentionRate}%`,
                sub: `${won.length} / ${totalPrompts} prompts`,
                up: mentionRate >= 50,
              },
              {
                label: "Citations",
                value: `${allCitations.length}`,
                sub: `${ownCitations.length} from your domain`,
                up: ownCitations.length > 0,
              },
              {
                label: "Citation Rate",
                value: `${citationRate}%`,
                sub: "share from your site",
                up: citationRate >= 20,
              },
              {
                label: "Competitors Seen",
                value: `${new Set(results.flatMap((r) => r.competitors_mentioned.map((c) => c.name))).size}`,
                sub: "unique in this scan",
                up: null,
              },
            ].map(({ label, value, sub, up }) => (
              <div key={label} className="bg-white rounded-xl border border-[#E5E5E1] p-4">
                <p className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-wider mb-2">{label}</p>
                <div className="flex items-end gap-1.5">
                  <p className="text-[18px] font-bold text-[#171717] leading-none">{value}</p>
                  {up !== null && (
                    up ? <TrendingUp size={14} className="text-[#166534] mb-0.5" /> : <TrendingDown size={14} className="text-[#991B1B] mb-0.5" />
                  )}
                </div>
                <p className="text-[11px] text-[#A3A3A0] mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          {history.length >= 2 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#171717] text-[15px]">Direct Score trend</h2>
                <span className="text-[11px] text-[#A3A3A0]">{history.length} scans</span>
              </div>
              <ScoreTrendChart history={history} />
            </Card>
          )}

          {/* Provider breakdown — table style */}
          {providerMap.size > 0 && (
            <Card>
              <h2 className="font-bold text-[#171717] text-[15px] mb-4">Platform breakdown</h2>
              <div className="border border-[#E5E5E1] rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid items-center px-5 py-2.5 border-b border-[#EEEEEA] bg-[#FAFAF8]"
                  style={{ gridTemplateColumns: "180px 1fr 80px 60px" }}>
                  {["Platform", "Visibility", "Won / Total", "Rate"].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                {/* Rows */}
                <div className="divide-y divide-[#EEEEEA]">
                  {Array.from(providerMap.entries()).map(([provider, { won: w, total: t }]) => {
                    const pct = Math.round((w / t) * 100);
                    const color = PROVIDER_COLORS[provider] ?? "#94A3B8";
                    const label = PROVIDER_LABELS[provider] ?? provider;
                    return (
                      <div key={provider}
                        className="grid items-center px-5 py-3 hover:bg-[#F5F5F2] transition-colors"
                        style={{ gridTemplateColumns: "180px 1fr 80px 60px" }}>
                        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#171717]">
                          <PlatformIcon platform={label} size={15} />
                          {label}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden max-w-[200px]">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                        <span className="text-[12px] text-[#777773] tabular-nums">{w} / {t}</span>
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: pct >= 50 ? "#15803D" : pct >= 25 ? "#B45309" : "#DC2626" }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Result list */}
          <Card>
            <h2 className="font-bold text-[#171717] text-[15px] mb-4">Prompt-level results</h2>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#EEEEEA]">
                    <th className="text-left text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-5 py-2.5">Prompt</th>
                    <th className="text-left text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-4 py-2.5">Provider</th>
                    <th className="text-left text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-4 py-2.5">Result</th>
                    <th className="text-right text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider px-5 py-2.5 hidden sm:table-cell">Citations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEA]">
                  {results.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F5F5F2] transition-colors">
                      <td className="px-5 py-3 max-w-[280px]">
                        <span className="block text-[13px] text-[#171717] font-medium line-clamp-2 leading-snug">
                          {r.prompt ?? <span className="text-[#A3A3A0] italic">prompt removed</span>}
                        </span>
                        {r.competitors_mentioned.length > 0 && (
                          <span className="text-[11px] text-[#A3A3A0]">
                            {r.competitors_mentioned.map((c) => c.name).join(", ")} mentioned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const lbl = PROVIDER_LABELS[r.provider] ?? r.provider;
                          return (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#777773] bg-[#F5F5F2] border border-[#E5E5E1] px-2 py-0.5 rounded-md">
                              <PlatformIcon platform={lbl} size={12} />
                              {lbl}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {r.business_mentioned ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#166534]">
                            <CheckCircle2 size={13} />
                            Mentioned
                            {r.mention_position && <span className="text-[#A3A3A0] font-normal">#{r.mention_position}</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#A3A3A0]">
                            <XCircle size={13} />
                            Not mentioned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right hidden sm:table-cell">
                        <span className="text-[12px] text-[#777773]">
                          {r.cited_sources.length > 0 ? `${r.cited_sources.length}×` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
