import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { Card, PageHeader } from "@/components/geo/dashboard/ui";
import BusinessSettingsForm from "@/components/geo/dashboard/BusinessSettingsForm";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { Building2, Check, CreditCard, User, AlertCircle, ExternalLink, Clock } from "lucide-react";
import { getPlan, PLANS, type PlanId } from "@/lib/plans";
import { stripeEnabled } from "@/lib/stripe";
import BillingPortalButton from "@/components/geo/BillingPortalButton";
import { getTrialStatus } from "@/lib/trial";

export const metadata = { title: "Settings", robots: { index: false } };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-[#166534]" },
  trialing: { label: "Trial", color: "text-[#166534]" },
  past_due: { label: "Payment failed", color: "text-[#991B1B]" },
  canceled: { label: "Canceled", color: "text-[#777773]" },
  inactive: { label: "Inactive", color: "text-[#777773]" },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
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

  const params = await searchParams;
  const checkoutSuccess = params.checkout === "success";
  const trialStatus = await getTrialStatus();
  const currentPlan = getPlan(subscription?.plan);
  const statusInfo =
    STATUS_LABELS[subscription?.status ?? "inactive"] ?? STATUS_LABELS.inactive;
  const hasActiveSub =
    subscription?.status === "active" || subscription?.status === "trialing";
  const hasStripeRecord = !!subscription?.stripe_customer_id;
  // Trial display: show trial info when no paid sub exists
  const showTrialStatus = !hasActiveSub && !hasStripeRecord;

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
    >
      <PageHeader
        title="Settings"
        description="Manage your business profile, plan, and account."
      />

      {/* Checkout success banner */}
      {checkoutSuccess && (
        <div className="mb-5 flex items-center gap-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3">
          <Check size={16} className="text-[#166534] shrink-0" aria-hidden="true" />
          <p className="text-[13px] text-[#166534] font-medium">
            Subscription activated! Your plan is now live.
          </p>
        </div>
      )}

      {/* Past-due warning */}
      {subscription?.status === "past_due" && (
        <div className="mb-5 flex items-start gap-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-[#991B1B] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[13px] text-[#991B1B]">
            <strong>Payment failed.</strong> Update your payment method to keep your subscription active.{" "}
            {hasStripeRecord && (
              <BillingPortalButton
                businessId={business.id}
                className="underline cursor-pointer"
              >
                Update now
              </BillingPortalButton>
            )}
          </p>
        </div>
      )}

      {/* Business Profile */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={15} className="text-[#777773]" />
          <h2 className="font-bold text-[#171717]">Business profile</h2>
        </div>
        <BusinessSettingsForm business={business} />
      </Card>

      {/* Plan & Billing */}
      <Card className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-[#777773]" />
            <h2 className="font-bold text-[#171717]">Plan & billing</h2>
          </div>
          {hasActiveSub && hasStripeRecord && (
            <BillingPortalButton
              businessId={business.id}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#777773] hover:text-[#171717] transition-colors"
            >
              Manage billing
              <ExternalLink size={11} aria-hidden="true" />
            </BillingPortalButton>
          )}
        </div>

        {/* Trial / current plan summary */}
        {showTrialStatus ? (
          <div className={`mb-5 p-4 rounded-xl border ${
            trialStatus.isExpired
              ? "bg-[#FEF2F2] border-[#FECACA]"
              : trialStatus.daysLeft <= 3
                ? "bg-[#FEF2F2] border-[#FECACA]"
                : trialStatus.daysLeft <= 7
                  ? "bg-[#FFFBEB] border-[#FDE68A]"
                  : "bg-[#F0FDF4] border-[#BBF7D0]"
          }`}>
            <div className="flex items-start gap-3">
              <Clock size={18} className={`shrink-0 mt-0.5 ${
                trialStatus.isExpired || trialStatus.daysLeft <= 3
                  ? "text-[#DC2626]"
                  : trialStatus.daysLeft <= 7
                    ? "text-[#D97706]"
                    : "text-[#166534]"
              }`} />
              <div>
                <p className="text-[13px] font-semibold text-[#171717]">
                  {trialStatus.isExpired
                    ? "Free trial ended"
                    : `14-Day Free Trial — ${trialStatus.daysLeft} day${trialStatus.daysLeft !== 1 ? "s" : ""} remaining`}
                </p>
                <p className="text-[12px] text-[#777773] mt-0.5">
                  {trialStatus.isExpired
                    ? "Your 14-day free trial has ended. Your data is safe and preserved."
                    : "Full platform access during your trial. No credit card required."}
                </p>
                {trialStatus.trialEndsAt && !trialStatus.isExpired && (
                  <p className="text-[11px] text-[#A3A3A0] mt-1">
                    Trial ends: {new Date(trialStatus.trialEndsAt).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric"
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-5 p-3.5 rounded-lg bg-[#FAFAF8] border border-[#E5E5E1]">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#171717]">{currentPlan.name}</p>
              <p className="text-[12px] text-[#777773]">{currentPlan.priceLabel}</p>
            </div>
            <span className={`text-[12px] font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        )}

        {/* Paid plan cards — only shown when Stripe is live and user has active paid sub, or always for reference */}
        {hasActiveSub && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {(["ai_visibility", "growth_agent", "autonomous_growth"] as PlanId[]).map((planId) => {
              const plan = PLANS[planId];
              const isActive = subscription?.plan === planId && hasActiveSub;
              return (
                <div
                  key={planId}
                  className={`relative rounded-xl border p-5 flex flex-col gap-3 ${
                    isActive
                      ? "border-[#171717] bg-white"
                      : plan.popular
                        ? "border-[#171717]/30 bg-white"
                        : "border-[#E5E5E1] bg-[#FAFAF8]"
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider bg-[#171717] text-white px-2.5 py-0.5 rounded-full">
                      Current plan
                    </span>
                  )}
                  {plan.popular && !isActive && (
                    <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider bg-[#F5F3FF] text-[#7C3AED] border border-[#EDE9FE] px-2.5 py-0.5 rounded-full">
                      Most popular
                    </span>
                  )}
                  <div>
                    <p className="text-[13px] font-bold text-[#171717]">{plan.name}</p>
                    <p className="text-[11px] text-[#777773] mt-0.5">{plan.tagline}</p>
                  </div>
                  <ul className="flex flex-col gap-1.5 flex-1">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[11.5px] text-[#555552]">
                        <Check size={11} className="text-[#166534] mt-0.5 shrink-0" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Upgrade CTA for trial / expired users */}
        {showTrialStatus && (
          <div className="bg-[#FAFAF8] border border-[#E5E5E1] rounded-xl p-4 mb-2">
            <p className="text-[13px] font-semibold text-[#171717] mb-1">Paid plans — coming soon</p>
            <p className="text-[12px] text-[#777773] mb-3">
              Self-serve subscription plans are launching soon. In the meantime, reach out and
              we&rsquo;ll set you up directly.
            </p>
            <a
              href="mailto:hello@customers.direct?subject=I want to continue with Customers.Direct"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-[#171717] text-white px-4 py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Contact us to upgrade →
            </a>
          </div>
        )}

        {hasActiveSub && hasStripeRecord && stripeEnabled ? (
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-[#A3A3A0]">Billing is managed via Stripe. </p>
            <BillingPortalButton
              businessId={business.id}
              className="text-[11px] text-[#777773] underline hover:no-underline cursor-pointer"
            >
              Open billing portal
            </BillingPortalButton>
            <span className="text-[11px] text-[#A3A3A0]">to update payment, view invoices, or cancel.</span>
          </div>
        ) : !showTrialStatus && (
          <p className="text-[11px] text-[#A3A3A0]">
            All plans billed monthly. No long-term contract required.{" "}
            <a href="mailto:hello@customers.direct" className="underline hover:no-underline">
              Contact us
            </a>{" "}
            to discuss custom arrangements.
          </p>
        )}
      </Card>

      {/* Agency / White-Label */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#7C3AED]" aria-hidden="true" />
          <h2 className="font-bold text-[#171717]">Agency & white-label</h2>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#7C3AED] bg-[#F5F3FF] border border-[#EDE9FE] px-1.5 py-0.5 rounded">
            Coming soon
          </span>
        </div>
        <p className="text-[13px] text-[#777773] mb-4">
          Manage multiple client businesses under one login. White-labeled reports under your agency branding.
        </p>
        <div className="bg-[#F5F3FF] rounded-lg border border-[#EDE9FE] px-4 py-3">
          <p className="text-[12px] text-[#7C3AED]">
            <strong>Interested in agency/reseller pricing?</strong>{" "}
            <a href="/book" className="underline hover:no-underline">
              Book a call
            </a>{" "}
            to discuss wholesale pricing and white-label rollout.
          </p>
        </div>
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
