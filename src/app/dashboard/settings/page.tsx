import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, PageHeader } from "@/components/geo/dashboard/ui";
import BusinessSettingsForm from "@/components/geo/dashboard/BusinessSettingsForm";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { Building2, User, CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
    >
      <PageHeader
        title="Settings"
        description="Manage your business profile and account."
      />

      {/* Business Profile */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={15} className="text-[#777773]" />
          <h2 className="font-bold text-[#171717]">Business profile</h2>
        </div>
        <BusinessSettingsForm business={business} />
      </Card>

      {/* Billing — link to dedicated billing page */}
      <Card className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-[#777773]" />
            <h2 className="font-bold text-[#171717]">Billing & Plans</h2>
          </div>
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#0866F5] hover:text-[#063B9D] transition-colors"
          >
            Open Billing
            <ExternalLink size={11} />
          </Link>
        </div>
        <p className="text-[13px] text-[#777773] leading-relaxed mb-3">
          View your plan, add businesses, manage invoices, and update payment methods on the Billing page.
        </p>
        <p className="text-[12px] text-[#A3A3A0]">
          Add as many businesses as you need. Each business has its own monitoring plan.
          One account. One monthly invoice.
        </p>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-[13px] font-semibold text-white bg-[#171717] rounded-lg hover:bg-[#333] transition-colors"
        >
          <CreditCard size={13} />
          Go to Billing
        </Link>
      </Card>

      {/* Account */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User size={15} className="text-[#777773]" />
          <h2 className="font-bold text-[#171717]">Account</h2>
        </div>
        <div className="flex items-center gap-3 py-2 border-b border-[#EEEEEA] mb-3">
          <div className="w-8 h-8 rounded-full bg-[#F0F0EC] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#777773]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#171717]">{user?.email}</p>
            <p className="text-[11px] text-[#A3A3A0]">
              Authenticated via Supabase Auth (email or Google)
            </p>
          </div>
        </div>
        <p className="text-[12px] text-[#A3A3A0]">
          To change your password, use the{" "}
          <a href="/forgot-password" className="underline hover:no-underline">
            forgot password
          </a>{" "}
          flow on the login page.
        </p>
      </Card>
    </DashboardShell>
  );
}
