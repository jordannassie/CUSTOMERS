import { redirect } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import OpportunityCard from "@/components/geo/dashboard/OpportunityCard";
import { EmptyState } from "@/components/geo/dashboard/ui";
import { getLiveOpportunities } from "@/modules/insights";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Opportunities", robots: { index: false } };

export default async function OpportunitiesPage() {
  const workspace = await getWorkspace({ next: "/dashboard/opportunities" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  // Google values in the text are filled in live on each view, never stored (D-73).
  const opportunities = (await getLiveOpportunities(business.id)) ?? [];
  const open = opportunities.filter((o) => o.status !== "dismissed" && o.status !== "resolved");
  const closed = opportunities.filter((o) => o.status === "dismissed" || o.status === "resolved");

  return (
    <PageContainer>
      <h1 className="text-[18px] font-bold text-[#171717] mb-1">Opportunities</h1>
      <p className="text-[13px] text-[#777773] mb-6">
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
            <OpportunityCard key={o.id} opportunity={o} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[11px] font-semibold text-[#A3A3A0] uppercase tracking-widest mb-4">
            Resolved / dismissed
          </h2>
          <div className="flex flex-col gap-4 opacity-70">
            {closed.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
