import { redirect } from "next/navigation";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import DirectAgentChat from "@/components/geo/dashboard/DirectAgentChat";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Direct Agent", robots: { index: false } };

export default async function DirectAgentPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  return (
    <DashboardShell businessId={business.id} businessName={business.name} businessLogoUrl={business.logo_url} businessDomain={business.domain}>
      <h1 className="text-[18px] font-bold text-[#171717] mb-1">Direct Agent</h1>
      <p className="text-[13px] text-[#777773] mb-6">
        A business-specific assistant grounded in your real visibility data.
      </p>
      <DirectAgentChat businessId={business.id} />
    </DashboardShell>
  );
}
