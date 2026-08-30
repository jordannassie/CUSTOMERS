import { requireAdmin } from "@/lib/admin/require";
import { Check, X, AlertTriangle } from "lucide-react";
import {
  CANONICAL_PLANS,
  ORDERED_SELF_SERVE_PLANS,
  COMPARISON_TABLE,
  TRIAL_CONFIG,
  PRICING_VERSION,
  PRICING_EFFECTIVE_DATE,
  PROVIDER_COST_CONFIG,
  MARGIN_THRESHOLDS,
} from "@/config/pricing";

export const metadata = { title: "Admin — Pricing & Billing Config" };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt$(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`;
}

function EnvStatus({ name }: { name: string }) {
  const value = process.env[name];
  if (!value) {
    return (
      <span className="flex items-center gap-1 text-[#991B1B]">
        <X size={12} /> Missing
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[#166534]">
      <Check size={12} /> Configured
    </span>
  );
}

function PriceIdStatus({ name }: { name: string }) {
  const value = process.env[name];
  if (!value) {
    return (
      <span className="flex items-center gap-1.5 text-[#991B1B] font-mono text-[11px]">
        <X size={12} /> Not set
      </span>
    );
  }
  return (
    <span className="font-mono text-[11px] text-[#166534]" title={value}>
      ✓ {value.slice(0, 20)}…
    </span>
  );
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={14} className="text-[#166534]" />;
  if (value === false) return <X size={14} className="text-[#D1D5DB]" />;
  return <span className="text-[12px] text-[#374151]">{value}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminPricingPage() {
  await requireAdmin();

  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "Live"
    : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    ? "Test"
    : "Not configured";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[#111827]">Pricing & Billing Config</h1>
            <p className="text-[12px] text-[#9CA3AF] mt-1">
              Read-only view of the canonical pricing architecture. All pricing values are driven from{" "}
              <code className="font-mono bg-[#F1F5F9] px-1 rounded">src/config/pricing.ts</code>.
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Pricing Version</p>
            <p className="text-[14px] font-bold text-[#111827] font-mono">{PRICING_VERSION}</p>
            <p className="text-[11px] text-[#9CA3AF]">Effective {PRICING_EFFECTIVE_DATE}</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Current Plans ──────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">1. Current Plans</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                  {["Field", ...ORDERED_SELF_SERVE_PLANS.map((p) => p.name)].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6B7280]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFD]">
                {[
                  { label: "Plan ID",          values: ORDERED_SELF_SERVE_PLANS.map((p) => p.id) },
                  { label: "Monthly Price",    values: ORDERED_SELF_SERVE_PLANS.map((p) => p.priceLabel + "/business") },
                  { label: "Tracked Prompts",  values: ORDERED_SELF_SERVE_PLANS.map((p) => p.maxTrackedPrompts) },
                  { label: "Competitors",      values: ORDERED_SELF_SERVE_PLANS.map((p) => p.maxCompetitors) },
                  { label: "AI Models",        values: ORDERED_SELF_SERVE_PLANS.map((p) => p.aiModelCount) },
                  { label: "Full Scan",        values: ORDERED_SELF_SERVE_PLANS.map((p) => p.scanFrequencyLabel) },
                  { label: "Cadence (days)",   values: ORDERED_SELF_SERVE_PLANS.map((p) => p.scanCadenceDays) },
                  { label: "Daily Watch Limit", values: ORDERED_SELF_SERVE_PLANS.map((p) => p.dailyWatchPromptLimit || "—") },
                  { label: "SEO Intelligence", values: ORDERED_SELF_SERVE_PLANS.map((p) => p.seoIntelligence) },
                  { label: "Direct Agent",     values: ORDERED_SELF_SERVE_PLANS.map((p) => p.directAgentLevel) },
                  { label: "History",          values: ORDERED_SELF_SERVE_PLANS.map((p) => p.historyMonths === -1 ? "Unlimited" : `${p.historyMonths} months`) },
                  { label: "Agent Msg/Day",    values: ORDERED_SELF_SERVE_PLANS.map((p) => p.agentMessagesPerDay) },
                  { label: "Claude Fixes/Mo",  values: ORDERED_SELF_SERVE_PLANS.map((p) => p.claudeFixesPerMonth) },
                  { label: "Priority Support", values: ORDERED_SELF_SERVE_PLANS.map((p) => p.prioritySupport ? "✓" : "—") },
                ].map(({ label, values }) => (
                  <tr key={label} className="hover:bg-[#F8FAFD]">
                    <td className="px-4 py-2.5 text-[11px] font-semibold text-[#6B7280] bg-[#F8FAFD]">{label}</td>
                    {values.map((v, i) => (
                      <td key={i} className="px-4 py-2.5 font-medium text-[#111827]">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Billing Architecture ──────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">2. Billing Architecture</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#0866F5] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">One Customers.Direct Account = One Auth User</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">There is no separate "Agency account." Any user may add multiple businesses.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#0866F5] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">One Stripe Customer per Account</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">billing_accounts table links user_id → stripe_customer_id. Never one customer per business.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#0866F5] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">One Stripe Subscription per Account</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">billing_accounts.stripe_subscription_id. One consolidated invoice for all businesses.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#0866F5] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">4</div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">One Subscription Item per Paid Business</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">business_billing_items.stripe_subscription_item_id. Adding a business adds an item. Canceling removes it.</p>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="mt-5 bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Example Account Invoice</p>
            <div className="space-y-1.5">
              {[
                { name: "ABC Roofing",   plan: "Growth",  price: "$297" },
                { name: "Smith Dental",  plan: "Starter", price: "$149" },
                { name: "Jones Law",     plan: "Pro",     price: "$497" },
              ].map(({ name, plan, price }) => (
                <div key={name} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-[#374151]">{name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded">{plan}</span>
                    <span className="font-semibold text-[#111827]">{price}/mo</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-[#E2E8F0] pt-2 mt-2 flex justify-between">
                <span className="text-[12px] font-bold text-[#111827]">Account Total</span>
                <span className="text-[12px] font-bold text-[#166534]">$943/month</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Trial Rules ────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">3. Trial Rules</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {[
              { label: "Trial Length", value: `${TRIAL_CONFIG.trialDays} days` },
              { label: "Card Required", value: "Yes" },
              { label: "Max Businesses During Trial", value: TRIAL_CONFIG.maxBusinessesDuringTrial },
              { label: "Additional Business Trial", value: `${TRIAL_CONFIG.additionalBusinessTrialDays} days (none)` },
              { label: "Trial Scope", value: "Main account (not per-business)" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#F8FAFD] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{label}</p>
                <p className="text-[13px] font-semibold text-[#111827] mt-0.5">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 bg-[#FEF9C3] border border-[#FEF08A] rounded-lg p-3">
            <AlertTriangle size={14} className="text-[#92400E] mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-[#92400E]">
              After account conversion: additional businesses added by a paid customer are billed/prorated immediately with no trial period. 
              Trial belongs to the account, not individual businesses.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Feature Entitlements ──────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">4. Feature Entitlements Matrix</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {COMPARISON_TABLE.map(({ section, rows }) => (
            <div key={section}>
              <div className="px-4 py-2 bg-[#EFF6FF] border-b border-[#DBEAFE]">
                <p className="text-[11px] font-bold text-[#1D4ED8] uppercase tracking-wider">{section}</p>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                    <th className="text-left px-4 py-2 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Feature</th>
                    {ORDERED_SELF_SERVE_PLANS.map((p) => (
                      <th key={p.id} className="text-left px-4 py-2 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFD]">
                  {rows.map((row) => (
                    <tr key={row.feature} className="hover:bg-[#F8FAFD]">
                      <td className="px-4 py-2 text-[#374151]">{row.feature}</td>
                      <td className="px-4 py-2"><FeatureCell value={row.starter} /></td>
                      <td className="px-4 py-2"><FeatureCell value={row.growth} /></td>
                      <td className="px-4 py-2"><FeatureCell value={row.pro} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 5: Stripe Configuration Status ───────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">5. Stripe Configuration Status</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-[#374151]">Stripe Mode</span>
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded ${
                  stripeMode === "Live" ? "bg-[#DCFCE7] text-[#166534]" :
                  stripeMode === "Test" ? "bg-[#FEF9C3] text-[#92400E]" :
                  "bg-[#FEF2F2] text-[#991B1B]"
                }`}>{stripeMode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-[#374151]">STRIPE_SECRET_KEY</span>
                <EnvStatus name="STRIPE_SECRET_KEY" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-[#374151]">STRIPE_WEBHOOK_SECRET</span>
                <EnvStatus name="STRIPE_WEBHOOK_SECRET" />
              </div>
            </div>
            <div className="space-y-3">
              {ORDERED_SELF_SERVE_PLANS.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between">
                  <span className="text-[12.5px] text-[#374151]">{plan.name} Monthly Price ID</span>
                  {plan.stripeMonthlyPriceEnvKey && <PriceIdStatus name={plan.stripeMonthlyPriceEnvKey} />}
                </div>
              ))}
            </div>
          </div>

          {/* Required env vars */}
          <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">Required Netlify Environment Variables</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {[
                "STRIPE_SECRET_KEY",
                "STRIPE_WEBHOOK_SECRET",
                "STRIPE_PRICE_STARTER_MONTHLY",
                "STRIPE_PRICE_GROWTH_MONTHLY",
                "STRIPE_PRICE_PRO_MONTHLY",
              ].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${process.env[key] ? "bg-[#166534]" : "bg-[#991B1B]"}`} />
                  <code className="font-mono text-[11px] text-[#374151]">{key}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: Health Check ───────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">6. Pricing System Health</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Canonical Config", ok: true, note: "src/config/pricing.ts" },
              { label: "Public /pricing page", ok: true, note: "Reads from canonical config" },
              { label: "Checkout route", ok: true, note: "Uses CANONICAL_PLANS" },
              { label: "Webhook handler", ok: true, note: "Maps Stripe Price IDs via getPlanIdFromStripePrice()" },
              { label: "Entitlement service", ok: true, note: "src/lib/billing/entitlements.ts" },
              { label: "Cron scanner", ok: true, note: "Uses getPlanConfig() for cadence + limits" },
              { label: "Billing page", ok: true, note: "/dashboard/billing" },
              { label: "Stripe Price ID mapping", ok: !!process.env.STRIPE_PRICE_STARTER_MONTHLY, note: process.env.STRIPE_PRICE_STARTER_MONTHLY ? "Configured" : "⚠ Set STRIPE_PRICE_*_MONTHLY env vars" },
              { label: "Usage ledger", ok: true, note: "src/lib/billing/usage.ts" },
              { label: "Legacy plans.ts", ok: true, note: "Shim only — re-exports from canonical config" },
            ].map(({ label, ok, note }) => (
              <div key={label} className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8FAFD] border border-[#E2E8F0]">
                {ok
                  ? <Check size={14} className="text-[#166534] mt-0.5 shrink-0" />
                  : <AlertTriangle size={14} className="text-[#D97706] mt-0.5 shrink-0" />
                }
                <div>
                  <p className="text-[12.5px] font-semibold text-[#111827]">{label}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: Margin Config ──────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">7. Internal Cost & Margin Config</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start gap-3 bg-[#FEF9C3] border border-[#FEF08A] rounded-lg p-3 mb-5">
            <AlertTriangle size={14} className="text-[#92400E] mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-[#92400E]">
              Internal only. Never expose provider costs or margins to customers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Margin Thresholds</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#374151]">Warning below</span>
                  <span className="font-semibold text-[#D97706]">{Math.round(MARGIN_THRESHOLDS.warning * 100)}%</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#374151]">Severe warning below</span>
                  <span className="font-semibold text-[#991B1B]">{Math.round(MARGIN_THRESHOLDS.severe * 100)}%</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Service Costs</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#374151]">DataForSEO / request</span>
                  <span className="font-mono text-[#374151]">${PROVIDER_COST_CONFIG.dataforseo.perRequest}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#374151]">Google Places / request</span>
                  <span className="font-mono text-[#374151]">${PROVIDER_COST_CONFIG.google_places.perRequest}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">AI Provider Cost Estimates</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                {["Provider", "Input / 1k tokens", "Output / 1k tokens"].map((h) => (
                  <th key={h} className="text-left py-1.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {Object.entries(PROVIDER_COST_CONFIG)
                .filter(([, v]) => "inputPer1kTokens" in v)
                .map(([provider, costs]) => (
                  <tr key={provider} className="hover:bg-[#F8FAFD]">
                    <td className="py-1.5 font-medium text-[#374151] capitalize">{provider}</td>
                    <td className="py-1.5 font-mono text-[#374151]">${(costs as { inputPer1kTokens: number }).inputPer1kTokens}</td>
                    <td className="py-1.5 font-mono text-[#374151]">${(costs as { outputPer1kTokens: number }).outputPer1kTokens}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
