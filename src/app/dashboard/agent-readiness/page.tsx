import { redirect } from "next/navigation";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import AgentReadinessClient from "./AgentReadinessClient";
import type { AgentReadinessScan, AgentReadinessAction } from "@/lib/agent-readiness/types";

export const metadata = { title: "AI Agent Readiness", robots: { index: false } };

export default async function AgentReadinessPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch latest completed scan
  const service = createServiceClient();
  const { data: scan } = await service
    .from("agent_readiness_scans")
    .select("*")
    .eq("business_id", business.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let actions: AgentReadinessAction[] = [];
  if (scan) {
    const { data } = await service
      .from("agent_readiness_actions")
      .select("*")
      .eq("scan_id", scan.id)
      .order("detected", { ascending: false });
    actions = (data ?? []) as AgentReadinessAction[];
  }

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
    >
      <AgentReadinessClient
        business={{
          id: business.id,
          name: business.name,
          domain: business.domain,
        }}
        initialScan={(scan as AgentReadinessScan) ?? null}
        initialActions={actions}
      />
    </DashboardShell>
  );
}
