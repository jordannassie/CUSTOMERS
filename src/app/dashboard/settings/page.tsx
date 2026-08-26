import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, PageHeader } from "@/components/geo/dashboard/ui";
import BusinessSettingsForm from "@/components/geo/dashboard/BusinessSettingsForm";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { Building2, CreditCard, User, Lock, Palette } from "lucide-react";

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
    <DashboardShell businessId={business.id} businessName={business.name}>
      <PageHeader
        title="Settings"
        description="Manage your business profile, plan, and account."
      />

      {/* Business Profile */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={15} className="text-[#2563EB]" />
          <h2 className="font-bold text-[#0F172A]">Business profile</h2>
        </div>
        <BusinessSettingsForm business={business} />
      </Card>

      {/* Plan */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={15} className="text-[#2563EB]" />
          <h2 className="font-bold text-[#0F172A]">Plan & billing</h2>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[15px] font-bold text-[#0F172A] mb-0.5">
              {PLAN_LABELS[subscription?.plan ?? "none"]}
            </p>
            <p className="text-[12px] text-[#94A3B8] mb-4">
              Status: <span className="font-semibold">{subscription?.status ?? "inactive"}</span>
              {" · "}
              Billing is handled separately — contact us to activate or change your plan.
            </p>
            <a
              href="/ai-search#pricing"
              className="inline-flex text-[13px] font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
            >
              View plans →
            </a>
          </div>
          <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3 text-center min-w-[140px]">
            <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold mb-1">Business</p>
            <p className="text-[13px] font-bold text-[#0F172A] truncate">{business.name}</p>
          </div>
        </div>
      </Card>

      {/* Agency / White-Label */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={15} className="text-[#7C3AED]" />
          <h2 className="font-bold text-[#0F172A]">Agency & white-label</h2>
          <span className="text-[9px] font-black uppercase tracking-wider text-[#7C3AED] bg-[#F5F3FF] border border-[#EDE9FE] px-1.5 py-0.5 rounded">
            Coming soon
          </span>
        </div>
        <p className="text-[13px] text-[#64748B] mb-5">
          Manage multiple client businesses under one login and generate white-labeled reports with your agency branding.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {[
            {
              title: "Agency branding",
              desc: "Add your logo and name to reports. Clients see your brand, not Customers.Direct.",
              available: false,
            },
            {
              title: "White-label reports",
              desc: "Generate shareable client reports under your agency brand.",
              available: false,
            },
            {
              title: "Client billing separation",
              desc: "You are invoiced by Customers.Direct. Your clients are never contacted about billing.",
              available: true,
            },
            {
              title: "Multi-business management",
              desc: "Each business is its own workspace. Switch between them from the left sidebar.",
              available: true,
            },
          ].map(({ title, desc, available }) => (
            <div
              key={title}
              className={`rounded-lg border p-4 ${
                available ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <p className={`text-[13px] font-bold ${available ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                  {title}
                </p>
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    available
                      ? "bg-[#F0FDF4] text-[#16A34A]"
                      : "bg-slate-100 text-[#94A3B8]"
                  }`}
                >
                  {available ? "Active" : "Coming soon"}
                </span>
              </div>
              <p className="text-[12px] text-[#64748B] leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#F5F3FF] rounded-lg border border-[#EDE9FE] px-4 py-3">
          <p className="text-[12px] text-[#7C3AED]">
            <span className="font-bold">Interested in agency/reseller pricing?</span>{" "}
            <a href="/book" className="underline hover:no-underline">Book a call</a> to discuss wholesale pricing and white-label rollout.
          </p>
        </div>
      </Card>

      {/* Account */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User size={15} className="text-[#2563EB]" />
          <h2 className="font-bold text-[#0F172A]">Account</h2>
        </div>
        <div className="flex items-center gap-3 py-2 border-b border-slate-100 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#2563EB]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#0F172A]">{user?.email}</p>
            <p className="text-[11px] text-[#94A3B8]">Google login via Supabase Auth</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#94A3B8]">
          <Lock size={12} />
          <span>Authentication is managed by Google OAuth. No password to change.</span>
        </div>
      </Card>
    </DashboardShell>
  );
}
