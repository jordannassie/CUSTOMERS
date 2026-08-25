import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import OpportunityCard from "@/components/geo/dashboard/OpportunityCard";
import { EmptyState } from "@/components/geo/dashboard/ui";
import { getPrimaryBusiness, getOpportunities } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Opportunities", robots: { index: false } };

export default async function OpportunitiesPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const opportunities = await getOpportunities(business.id);
  const open = opportunities.filter((o) => o.status !== "dismissed" && o.status !== "resolved");
  const closed = opportunities.filter((o) => o.status === "dismissed" || o.status === "resolved");

  return (
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">Opportunities</h1>
      <p className="text-sm text-[#64748B] mb-6">
        Evidence-backed recommendations generated from your latest visibility scan.
      </p>

      {open.length === 0 ? (
        <EmptyState
          title="No open opportunities"
          body="Run a visibility scan from the Overview page to generate fresh, evidence-based recommendations."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {open.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} businessId={business.id} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-4">
            Resolved / dismissed
          </h2>
          <div className="flex flex-col gap-4 opacity-70">
            {closed.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} businessId={business.id} />
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
