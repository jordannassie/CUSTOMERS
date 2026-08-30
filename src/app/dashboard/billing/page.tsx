import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import DashboardShell from "@/components/geo/dashboard/DashboardShell";
import { getPrimaryBusiness } from "@/lib/geo/dashboard-data";
import { requireStripe } from "@/lib/stripe";
import {
  CANONICAL_PLANS,
  ORDERED_SELF_SERVE_PLANS,
  getPlanConfig,
  TRIAL_CONFIG,
  type CanonicalPlanId,
} from "@/config/pricing";
import BillingPageClient from "./BillingPageClient";

export const metadata = { title: "Billing", robots: { index: false } };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getPrimaryBusiness();
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const svc = createServiceClient();
  const params = await searchParams;

  // ── Billing account ───────────────────────────────────────────────────────
  const { data: ba } = await svc
    .from("billing_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // ── All businesses owned by this user ────────────────────────────────────
  const { data: allBusinesses } = await svc
    .from("businesses")
    .select("id, name, domain, logo_url, status")
    .eq("owner_user_id", user.id)
    .neq("status", "onboarding")
    .order("created_at", { ascending: true });

  // ── Business billing items ────────────────────────────────────────────────
  const { data: billingItems } = ba
    ? await svc
        .from("business_billing_items")
        .select("*")
        .eq("billing_account_id", ba.id)
    : { data: [] };

  // ── Prompt usage per business (for this billing period) ──────────────────
  const { data: promptCounts } = await svc
    .from("tracked_prompts")
    .select("business_id")
    .in("business_id", (allBusinesses ?? []).map((b) => b.id))
    .eq("active", true);

  const promptCountByBusiness: Record<string, number> = {};
  for (const p of promptCounts ?? []) {
    promptCountByBusiness[p.business_id] = (promptCountByBusiness[p.business_id] ?? 0) + 1;
  }

  // ── AI Check usage this billing period ───────────────────────────────────
  const periodStart = ba?.current_period_start ?? new Date(new Date().setDate(1)).toISOString();
  const { data: usageEvents } = await svc
    .from("usage_events")
    .select("business_id, usage_type, quantity")
    .eq("account_user_id", user.id)
    .gte("created_at", periodStart);

  const aiChecksByBusiness: Record<string, number> = {};
  const agentUsageByBusiness: Record<string, number> = {};
  for (const e of usageEvents ?? []) {
    if (e.usage_type === "ai_visibility_check" && e.business_id) {
      aiChecksByBusiness[e.business_id] = (aiChecksByBusiness[e.business_id] ?? 0) + (e.quantity ?? 1);
    }
    if (e.usage_type === "direct_agent" && e.business_id) {
      agentUsageByBusiness[e.business_id] = (agentUsageByBusiness[e.business_id] ?? 0) + 1;
    }
  }

  // ── Invoices (Stripe) ─────────────────────────────────────────────────────
  let invoices: Array<{
    id: string;
    number: string | null;
    status: string | null;
    amountPaid: number;
    amountDue: number;
    currency: string;
    created: number;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
  }> = [];

  if (ba?.stripe_customer_id) {
    try {
      const stripe = requireStripe();
      const list = await stripe.invoices.list({
        customer: ba.stripe_customer_id,
        limit: 12,
      });
      invoices = list.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status as string | null,
        amountPaid: inv.amount_paid,
        amountDue: inv.amount_due,
        currency: inv.currency,
        created: inv.created,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
      }));
    } catch {
      // Stripe not configured or error — show empty invoices
    }
  }

  // ── Compute total MRR ─────────────────────────────────────────────────────
  const itemMap = Object.fromEntries(
    (billingItems ?? []).map((i) => [i.business_id, i])
  );

  const activeItems = (billingItems ?? []).filter(
    (i) => i.status === "active" || i.status === "trialing"
  );
  const totalMrrCents = activeItems.reduce((sum, item) => {
    return sum + (item.price_monthly_cents ?? getPlanConfig(item.plan_id).priceMonthly);
  }, 0);

  const businesses = (allBusinesses ?? []).map((b) => {
    const item = itemMap[b.id];
    const plan = getPlanConfig(item?.plan_id);
    return {
      ...b,
      planId: (item?.plan_id ?? "beta") as CanonicalPlanId | "beta",
      planName: item?.plan_id === "beta" ? "Beta (Free)" : plan.name,
      billingStatus: item?.status ?? "beta",
      priceMonthly: item?.price_monthly_cents ?? (item?.plan_id && item.plan_id !== "beta" ? plan.priceMonthly : 0),
      promptsUsed: promptCountByBusiness[b.id] ?? 0,
      promptsAllowed: plan.maxTrackedPrompts,
      aiChecks: aiChecksByBusiness[b.id] ?? 0,
      agentUsage: agentUsageByBusiness[b.id] ?? 0,
    };
  });

  return (
    <DashboardShell
      businessId={business.id}
      businessName={business.name}
      businessLogoUrl={business.logo_url}
      businessDomain={business.domain}
    >
      <BillingPageClient
        billingAccount={ba}
        businesses={businesses}
        invoices={invoices}
        totalMrrCents={totalMrrCents}
        checkoutSuccess={params.checkout === "success"}
        plans={ORDERED_SELF_SERVE_PLANS}
        trialConfig={TRIAL_CONFIG}
      />
    </DashboardShell>
  );
}
