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
    <DashboardShell businessId={business.id} businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">Tracked Prompts</h1>
      <p className="text-sm text-[#64748B] mb-6">
        The buyer-intent questions we ask AI providers on your behalf. Uncheck a prompt to pause it
        without deleting it.
      </p>

      <Card>
        <PromptsManager businessId={business.id} prompts={prompts} />
      </Card>
    </DashboardShell>
  );
}
