import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card } from "@/components/geo/dashboard/ui";
import CompetitorsManager from "@/components/geo/dashboard/CompetitorsManager";
import { getPrimaryBusiness, getCompetitors } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Competitors", robots: { index: false } };

export default async function CompetitorsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const competitors = await getCompetitors(business.id);

  return (
    <DashboardShell businessId={business.id} businessName={business.name} businessLogoUrl={business.logo_url} businessDomain={business.domain}>
      <h1 className="text-[18px] font-bold text-[#171717] mb-1">Competitors</h1>
      <p className="text-[13px] text-[#777773] mb-6">
        The businesses we compare your AI mentions against.
      </p>

      <Card>
        <CompetitorsManager businessId={business.id} competitors={competitors} />
      </Card>
    </DashboardShell>
  );
}
