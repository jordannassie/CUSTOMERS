import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, EmptyState } from "@/components/geo/dashboard/ui";
import { getPrimaryBusiness, getScoreHistory, getOpportunities } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Reports", robots: { index: false } };

export default async function ReportsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [history, opportunities] = await Promise.all([
    getScoreHistory(business.id, 24),
    getOpportunities(business.id),
  ]);

  const statusCounts = opportunities.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">Reports</h1>
      <p className="text-sm text-[#64748B] mb-6">A record of every scan and how your Direct Score moved.</p>

      {history.length === 0 ? (
        <EmptyState title="No scans yet" body="Reports build up automatically as scans run." />
      ) : (
        <Card className="mb-6">
          <h2 className="font-bold text-[#0F172A] mb-4">Scan history</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {[...history].reverse().map((h) => (
              <div key={h.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-[#64748B]">{new Date(h.calculated_at).toLocaleString()}</span>
                <span className="font-bold text-[#0F172A]">{h.score}/100</span>
                <span className="text-[#94A3B8] text-xs">
                  {h.prompts_won}/{h.prompts_tested} won
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-[#0F172A] mb-4">Opportunity status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["open", "in_progress", "resolved", "dismissed"].map((status) => (
            <div key={status} className="text-center">
              <p className="text-2xl font-black text-[#0F172A]">{statusCounts[status] ?? 0}</p>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold mt-1">
                {status.replace("_", " ")}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
