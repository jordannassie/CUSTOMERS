import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, EmptyState } from "@/components/geo/dashboard/ui";
import { getPrimaryBusiness, getLatestRun, getLatestRunResults } from "@/lib/geo/dashboard-data";

export const metadata = { title: "AI Visibility", robots: { index: false } };

export default async function VisibilityPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [latestRun, results] = await Promise.all([
    getLatestRun(business.id),
    getLatestRunResults(business.id),
  ]);

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">AI Visibility</h1>
      <p className="text-sm text-[#64748B] mb-6">
        {latestRun
          ? `Latest run: ${latestRun.provider} · ${new Date(latestRun.started_at).toLocaleString()} · ${latestRun.status}`
          : "No scans run yet."}
      </p>

      {results.length === 0 ? (
        <EmptyState
          title="No results yet"
          body="Run a scan from the Overview page to see exactly how AI providers respond to your tracked prompts."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {results.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-sm font-semibold text-[#0F172A] flex-1">{r.prompt ?? "(prompt removed)"}</p>
                {r.business_mentioned ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#16A34A]">
                    <CheckCircle2 size={14} /> Mentioned
                    {r.mention_position ? ` (~#${r.mention_position})` : ""}
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#94A3B8]">
                    <XCircle size={14} /> Not mentioned
                  </span>
                )}
              </div>

              {r.competitors_mentioned.length > 0 && (
                <p className="text-xs text-[#64748B] mb-1.5">
                  <span className="font-semibold text-[#0F172A]">Competitors mentioned:</span>{" "}
                  {r.competitors_mentioned.map((c) => c.name).join(", ")}
                </p>
              )}

              {r.cited_sources.length > 0 && (
                <p className="text-xs text-[#64748B] mb-1.5">
                  <span className="font-semibold text-[#0F172A]">Cited sources:</span>{" "}
                  {r.cited_sources.slice(0, 3).map((s) => s.url).join(", ")}
                </p>
              )}

              {r.methodology && (
                <p className="text-[11px] text-[#94A3B8] mt-2 border-t border-gray-100 pt-2">{r.methodology}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
