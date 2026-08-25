import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card } from "@/components/geo/dashboard/ui";
import BusinessSettingsForm from "@/components/geo/dashboard/BusinessSettingsForm";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";

export const metadata = { title: "Settings", robots: { index: false } };

const PLAN_LABELS: Record<string, string> = {
  none: "No active plan",
  ai_visibility: "AI Visibility — $497/mo",
  growth_agent: "Growth Agent — $997/mo",
  autonomous_growth: "Autonomous Growth — from $1,997/mo",
};

export default async function SettingsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  return (
    <DashboardShell businessName={business.name}>
      <h1 className="text-2xl font-black text-[#0F172A] mb-1">Settings</h1>
      <p className="text-sm text-[#64748B] mb-6">Manage your business profile and plan.</p>

      <Card className="mb-6">
        <h2 className="font-bold text-[#0F172A] mb-4">Business profile</h2>
        <BusinessSettingsForm business={business} />
      </Card>

      <Card className="mb-6">
        <h2 className="font-bold text-[#0F172A] mb-2">Plan</h2>
        <p className="text-sm text-[#0F172A] font-semibold mb-1">
          {PLAN_LABELS[subscription?.plan ?? "none"]}
        </p>
        <p className="text-xs text-[#94A3B8] mb-4">
          Status: {subscription?.status ?? "inactive"}. Billing isn&apos;t wired up to a payment processor yet —
          contact us to activate a paid plan.
        </p>
        <a
          href="/ai-search#pricing"
          className="inline-flex text-sm font-semibold text-[#2563EB]"
        >
          View plans →
        </a>
      </Card>

      <Card>
        <h2 className="font-bold text-[#0F172A] mb-2">Account</h2>
        <p className="text-sm text-[#64748B]">{user?.email}</p>
      </Card>
    </DashboardShell>
  );
}
