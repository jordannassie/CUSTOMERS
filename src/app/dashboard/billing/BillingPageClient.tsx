"use client";

import { useState } from "react";
import {
  CreditCard,
  Building2,
  BarChart2,
  FileText,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  ChevronDown,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { CanonicalPlan, CanonicalPlanId } from "@/config/pricing";

interface BillingAccount {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface BusinessBillingRow {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  status: string;
  planId: CanonicalPlanId | "beta";
  planName: string;
  billingStatus: string;
  priceMonthly: number;
  promptsUsed: number;
  promptsAllowed: number;
  aiChecks: number;
  agentUsage: number;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

interface Props {
  billingAccount: BillingAccount | null;
  businesses: BusinessBillingRow[];
  invoices: Invoice[];
  totalMrrCents: number;
  checkoutSuccess: boolean;
  plans: CanonicalPlan[];
  trialConfig: { trialDays: number; maxBusinessesDuringTrial: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt$(cents: number): string {
  return `$${(cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateStr(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  active:   { label: "Active",       cls: "bg-[#DCFCE7] text-[#166534]" },
  trialing: { label: "Trial",        cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  past_due: { label: "Payment Due",  cls: "bg-[#FEF2F2] text-[#991B1B]" },
  canceled: { label: "Canceled",     cls: "bg-[#F3F4F6] text-[#6B7280]" },
  beta:     { label: "Beta (Free)",  cls: "bg-[#F5F3FF] text-[#7C3AED]" },
  none:     { label: "No Plan",      cls: "bg-[#F3F4F6] text-[#6B7280]" },
  inactive: { label: "Inactive",     cls: "bg-[#F3F4F6] text-[#6B7280]" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.none;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (status === "paid") return <span className="text-[11px] font-semibold text-[#166534]">Paid</span>;
  if (status === "open") return <span className="text-[11px] font-semibold text-[#D97706]">Open</span>;
  if (status === "void") return <span className="text-[11px] text-[#6B7280]">Void</span>;
  return <span className="text-[11px] text-[#6B7280]">{status ?? "—"}</span>;
}

const NAV_TABS = [
  { id: "overview",   label: "Overview",          icon: CreditCard  },
  { id: "businesses", label: "Businesses & Plans", icon: Building2   },
  { id: "usage",      label: "Usage",              icon: BarChart2   },
  { id: "invoices",   label: "Invoices",           icon: FileText    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Plan selector modal
// ─────────────────────────────────────────────────────────────────────────────

function PlanSelectorModal({
  businessId,
  businessName,
  currentPlan,
  plans,
  action,
  onClose,
}: {
  businessId: string;
  businessName: string;
  currentPlan: string;
  plans: CanonicalPlan[];
  action: "subscribe" | "change";
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string>(currentPlan === "beta" ? "growth" : currentPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const endpoint = action === "subscribe"
        ? "/api/stripe/checkout"
        : "/api/stripe/change-plan";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selected, businessId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      if (json.url) window.location.href = json.url;
      else window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-5 border-b border-[#E5E5E1]">
          <h3 className="text-[15px] font-bold text-[#171717]">
            {action === "subscribe" ? "Subscribe" : "Change Plan"} — {businessName}
          </h3>
          <p className="text-[12px] text-[#777773] mt-1">
            {action === "subscribe"
              ? "Choose a plan. Card required. 14-day free trial."
              : "Select a new plan. Prorated billing applies immediately."}
          </p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selected === plan.id
                  ? "border-[#171717] bg-white"
                  : "border-[#E5E5E1] bg-[#FAFAF8] hover:border-[#C0C0BB]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-bold text-[#171717]">{plan.name}</span>
                <div className="flex items-center gap-2">
                  {plan.popular && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#7C3AED] bg-[#F5F3FF] px-1.5 py-0.5 rounded">Popular</span>
                  )}
                  <span className="text-[13px] font-bold text-[#171717]">{plan.priceLabel}<span className="text-[11px] font-normal text-[#777773]">/mo</span></span>
                </div>
              </div>
              <p className="text-[11px] text-[#777773]">
                {plan.maxTrackedPrompts} prompts · {plan.maxCompetitors} competitors · {plan.scanFrequencyLabel}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <p className="px-6 pb-3 text-[12px] text-[#991B1B]">{error}</p>
        )}

        <div className="px-6 py-4 border-t border-[#E5E5E1] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-[13px] font-medium text-[#777773] bg-[#FAFAF8] border border-[#E5E5E1] rounded-lg hover:bg-[#F0F0EC] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-[13px] font-bold text-white bg-[#171717] rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? "Processing…" : action === "subscribe" ? "Continue to Checkout" : "Change Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel modal
// ─────────────────────────────────────────────────────────────────────────────

function CancelModal({
  businessId,
  businessName,
  onClose,
}: {
  businessId: string;
  businessName: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/cancel-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="px-6 py-5 border-b border-[#FEE2E2]">
          <h3 className="text-[15px] font-bold text-[#991B1B]">Cancel Subscription</h3>
          <p className="text-[12px] text-[#777773] mt-1">{businessName}</p>
        </div>
        <div className="px-6 py-4">
          <p className="text-[13px] text-[#555552] leading-relaxed">
            Canceling will remove monitoring for <strong>{businessName}</strong> at the end of the current billing period. Your business data and history will be preserved.
          </p>
        </div>
        {error && <p className="px-6 pb-3 text-[12px] text-[#991B1B]">{error}</p>}
        <div className="px-6 py-4 border-t border-[#E5E5E1] flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-[#777773] bg-[#FAFAF8] border border-[#E5E5E1] rounded-lg hover:bg-[#F0F0EC] transition-colors">
            Keep Subscription
          </button>
          <button onClick={handleCancel} disabled={loading} className="flex-1 px-4 py-2.5 text-[13px] font-bold text-white bg-[#991B1B] rounded-lg hover:bg-[#7F1D1D] transition-colors disabled:opacity-50">
            {loading ? "Canceling…" : "Cancel Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Portal button
// ─────────────────────────────────────────────────────────────────────────────

function ManageInStripeButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }
  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Redirecting…" : children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function BillingPageClient({
  billingAccount,
  businesses,
  invoices,
  totalMrrCents,
  checkoutSuccess,
  plans,
  trialConfig,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [planModal, setPlanModal] = useState<{
    businessId: string;
    businessName: string;
    currentPlan: string;
    action: "subscribe" | "change";
  } | null>(null);
  const [cancelModal, setCancelModal] = useState<{
    businessId: string;
    businessName: string;
  } | null>(null);

  const acct = billingAccount;
  const isTrialing = acct?.status === "trialing";
  const isActive = acct?.status === "active";
  const isPastDue = acct?.status === "past_due";
  const hasStripe = !!acct?.stripe_customer_id;
  const trialEndsAt = acct?.trial_ends_at ? new Date(acct.trial_ends_at) : null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const activeBusinessCount = businesses.filter(
    (b) => b.billingStatus === "active" || b.billingStatus === "trialing"
  ).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="px-6 pt-8 pb-0">
        <h1 className="text-[22px] font-bold text-[#171717]">Billing</h1>
        <p className="text-[13px] text-[#777773] mt-1">
          Account-wide billing. One invoice for all your businesses.
        </p>
      </div>

      {/* Success banner */}
      {checkoutSuccess && (
        <div className="mx-6 mt-5 flex items-center gap-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3">
          <Check size={16} className="text-[#166534] shrink-0" />
          <p className="text-[13px] text-[#166534] font-medium">
            Subscription activated! Your plan is now live.
          </p>
        </div>
      )}

      {/* Past-due warning */}
      {isPastDue && (
        <div className="mx-6 mt-5 flex items-start gap-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-[#991B1B] shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-[#991B1B]">Payment failed</p>
            <p className="text-[12px] text-[#991B1B] mt-0.5">
              Please update your payment method to keep monitoring active.{" "}
              {hasStripe && (
                <ManageInStripeButton className="underline cursor-pointer">
                  Update now
                </ManageInStripeButton>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="px-6 mt-6 border-b border-[#E5E5E1]">
        <nav className="flex gap-1 -mb-px">
          {NAV_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-[#171717] text-[#171717]"
                  : "border-transparent text-[#777773] hover:text-[#171717]"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Monthly Total", value: fmt$(totalMrrCents), sub: "across all businesses" },
                { label: "Active Businesses", value: activeBusinessCount, sub: `of ${businesses.length} total` },
                {
                  label: "Account Status",
                  value: isActive ? "Active" : isTrialing ? "Trial" : isPastDue ? "Past Due" : "Beta",
                  sub: isTrialing && trialDaysLeft !== null ? `${trialDaysLeft} days left` : undefined,
                },
                {
                  label: "Next Billing",
                  value: acct?.current_period_end ? fmtDateStr(acct.current_period_end) : "—",
                  sub: isTrialing ? "Trial ends" : "Next invoice",
                },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white border border-[#E5E5E1] rounded-xl p-4">
                  <p className="text-[11px] font-semibold text-[#777773] uppercase tracking-wider mb-2">{label}</p>
                  <p className="text-[20px] font-bold text-[#171717] leading-none">{value}</p>
                  {sub && <p className="text-[11px] text-[#A3A3A0] mt-1">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Billing actions */}
            {hasStripe && (
              <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
                <h2 className="text-[14px] font-bold text-[#171717] mb-3">Payment & Billing</h2>
                <div className="flex flex-wrap gap-3">
                  <ManageInStripeButton className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#171717] rounded-lg hover:bg-[#333] transition-colors">
                    <CreditCard size={14} />
                    Manage in Stripe
                    <ExternalLink size={12} />
                  </ManageInStripeButton>
                </div>
                <p className="text-[11px] text-[#A3A3A0] mt-3">
                  Update payment method, download invoices, and manage your subscription in the Stripe portal.
                </p>
              </div>
            )}

            {/* Beta / no billing */}
            {!hasStripe && (
              <div className="bg-[#F5F3FF] border border-[#EDE9FE] rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Zap size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#7C3AED]">Free Beta Access</p>
                    <p className="text-[12px] text-[#6D28D9] mt-1 leading-relaxed">
                      You&apos;re on free beta access. Choose a plan for each business when you&apos;re ready to launch paid monitoring.
                      A {trialConfig.trialDays}-day trial is included — card required.
                    </p>
                    <button
                      onClick={() => setActiveTab("businesses")}
                      className="mt-3 text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                    >
                      View businesses & plans →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* How billing works */}
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
              <h2 className="text-[14px] font-bold text-[#171717] mb-3">How billing works</h2>
              <div className="space-y-2">
                {[
                  "One account. One Stripe invoice. All your businesses.",
                  "Add as many businesses as you need — each has its own plan.",
                  `Each additional business is billed immediately (prorated). No extra ${trialConfig.trialDays}-day trial.`,
                  "Change or cancel individual businesses without affecting others.",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2">
                    <Check size={14} className="text-[#166534] mt-0.5 shrink-0" />
                    <p className="text-[12px] text-[#555552]">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── BUSINESSES & PLANS TAB ────────────────────────────────────────── */}
        {activeTab === "businesses" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#171717]">Your Businesses</h2>
              <Link
                href="/dashboard/add-business"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[#171717] rounded-lg hover:bg-[#333] transition-colors"
              >
                <Plus size={13} />
                Add Business
              </Link>
            </div>

            <div className="bg-white border border-[#E5E5E1] rounded-xl overflow-hidden">
              {businesses.length === 0 ? (
                <p className="px-5 py-8 text-[13px] text-[#A3A3A0] text-center">No active businesses.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b border-[#F1F5F9] bg-[#FAFAF8]">
                        {["Business", "Plan", "Prompts", "Frequency", "Price", "Status", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#777773] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F8FAFC]">
                      {businesses.map((biz) => {
                        const plan = biz.planId !== "beta" ? (plans.find((p) => p.id === biz.planId) ?? null) : null;
                        return (
                          <tr key={biz.id} className="hover:bg-[#FAFAF8] transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#171717]">{biz.name}</p>
                              <p className="text-[11px] text-[#A3A3A0]">{biz.domain ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3 font-medium text-[#171717]">{biz.planName}</td>
                            <td className="px-4 py-3 text-[#555552]">
                              {biz.promptsUsed} / {biz.promptsAllowed === -1 ? "∞" : biz.promptsAllowed}
                            </td>
                            <td className="px-4 py-3 text-[#555552]">
                              {plan?.scanFrequencyLabel ?? "—"}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#171717]">
                              {biz.priceMonthly > 0 ? fmt$(biz.priceMonthly) + "/mo" : "Free"}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={biz.billingStatus} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setPlanModal({
                                    businessId: biz.id,
                                    businessName: biz.name,
                                    currentPlan: biz.planId,
                                    action: biz.billingStatus === "beta" || biz.billingStatus === "inactive" || biz.billingStatus === "none" ? "subscribe" : "change",
                                  })}
                                  className="text-[11px] font-semibold text-[#0866F5] hover:text-[#063B9D] transition-colors"
                                >
                                  {biz.billingStatus === "active" || biz.billingStatus === "trialing" ? "Change" : "Subscribe"}
                                </button>
                                {(biz.billingStatus === "active" || biz.billingStatus === "trialing") && (
                                  <button
                                    onClick={() => setCancelModal({ businessId: biz.id, businessName: biz.name })}
                                    className="text-[11px] text-[#991B1B] hover:underline"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Plan comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white border rounded-xl p-5 flex flex-col ${
                    plan.popular ? "border-[#171717]" : "border-[#E5E5E1]"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider bg-[#171717] text-white px-2.5 py-0.5 rounded-full">
                      Most popular
                    </span>
                  )}
                  <div className="mb-3">
                    <p className="text-[14px] font-bold text-[#171717]">{plan.name}</p>
                    <p className="text-[20px] font-bold text-[#171717] mt-1">
                      {plan.priceLabel}<span className="text-[12px] font-normal text-[#777773]">/mo</span>
                    </p>
                    <p className="text-[11px] text-[#777773] mt-0.5">per business</p>
                  </div>
                  <ul className="flex-1 space-y-1.5 mb-4">
                    {plan.features.slice(0, 6).map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#555552]">
                        <Check size={11} className="text-[#166534] mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── USAGE TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "usage" && (
          <>
            <div className="bg-white border border-[#E5E5E1] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F1F5F9]">
                <h2 className="text-[14px] font-bold text-[#171717]">Usage This Billing Period</h2>
                <p className="text-[11px] text-[#A3A3A0] mt-0.5">
                  Period: {acct?.current_period_start ? fmtDateStr(acct.current_period_start) : "—"} — {acct?.current_period_end ? fmtDateStr(acct.current_period_end) : "—"}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] bg-[#FAFAF8]">
                      {["Business", "Plan", "AI Checks", "Prompts Active", "Agent Messages"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#777773] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {businesses.map((biz) => (
                      <tr key={biz.id} className="hover:bg-[#FAFAF8] transition-colors">
                        <td className="px-4 py-3 font-medium text-[#171717]">{biz.name}</td>
                        <td className="px-4 py-3 text-[#555552]">{biz.planName}</td>
                        <td className="px-4 py-3 font-semibold text-[#171717]">{biz.aiChecks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[#555552]">
                          {biz.promptsUsed} / {biz.promptsAllowed === -1 ? "∞" : biz.promptsAllowed}
                        </td>
                        <td className="px-4 py-3 text-[#555552]">{biz.agentUsage}</td>
                      </tr>
                    ))}
                    {businesses.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-[#A3A3A0]">No usage data yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── INVOICES TAB ──────────────────────────────────────────────────── */}
        {activeTab === "invoices" && (
          <>
            {!hasStripe ? (
              <div className="bg-[#FAFAF8] border border-[#E5E5E1] rounded-xl p-6 text-center">
                <CreditCard size={32} className="text-[#C0C0BB] mx-auto mb-3" />
                <p className="text-[13px] text-[#777773]">No billing history yet.</p>
                <p className="text-[12px] text-[#A3A3A0] mt-1">Invoices will appear here once you subscribe.</p>
              </div>
            ) : (
              <>
                {hasStripe && (
                  <div className="flex justify-end">
                    <ManageInStripeButton className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#555552] bg-white border border-[#E5E5E1] rounded-lg hover:bg-[#FAFAF8] transition-colors">
                      <ExternalLink size={13} />
                      Manage in Stripe
                    </ManageInStripeButton>
                  </div>
                )}
                <div className="bg-white border border-[#E5E5E1] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="border-b border-[#F1F5F9] bg-[#FAFAF8]">
                          {["Date", "Invoice #", "Status", "Amount", ""].map((h) => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#777773] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F8FAFC]">
                        {invoices.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-[#A3A3A0]">No invoices yet.</td></tr>
                        ) : invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-[#FAFAF8] transition-colors">
                            <td className="px-4 py-3 text-[#555552]">{fmtDate(inv.created)}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#777773]">{inv.number ?? "—"}</td>
                            <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                            <td className="px-4 py-3 font-semibold text-[#171717]">
                              {fmt$(inv.status === "paid" ? inv.amountPaid : inv.amountDue)}
                            </td>
                            <td className="px-4 py-3">
                              {inv.hostedInvoiceUrl && (
                                <a
                                  href={inv.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-[#0866F5] hover:underline"
                                >
                                  View <ExternalLink size={11} />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {planModal && (
        <PlanSelectorModal
          {...planModal}
          plans={plans}
          onClose={() => setPlanModal(null)}
        />
      )}
      {cancelModal && (
        <CancelModal
          {...cancelModal}
          onClose={() => setCancelModal(null)}
        />
      )}
    </div>
  );
}
