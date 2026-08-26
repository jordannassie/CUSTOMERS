import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card } from "@/components/geo/dashboard/ui";
import PromptsManager from "@/components/geo/dashboard/PromptsManager";
import { getPrimaryBusiness, getTrackedPrompts } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Prompts", robots: { index: false } };

export default async function PromptsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const prompts = await getTrackedPrompts(business.id);

  return (
    <DashboardShell businessId={business.id} businessName={business.name} businessLogoUrl={business.logo_url} businessDomain={business.domain}>
      <h1 className="text-[18px] font-bold text-[#171717] mb-1">Tracked Prompts</h1>
      <p className="text-[13px] text-[#777773] mb-6">
        The buyer-intent questions we ask AI providers on your behalf. Uncheck a prompt to pause it
        without deleting it.
      </p>

      <Card>
        <PromptsManager businessId={business.id} prompts={prompts} />
      </Card>
    </DashboardShell>
  );
}
