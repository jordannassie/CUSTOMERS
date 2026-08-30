import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import { getPlanConfig } from "@/config/pricing";

export const metadata = { title: "Admin — Billing" };

function fmt$(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminBillingPage() {
  await requireAdmin();
  const svc = createServiceClient();

  // All billing accounts
  const { data: accounts } = await svc
    .from("billing_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  // All business billing items
  const { data: allItems } = await svc
    .from("business_billing_items")
    .select("*");

  const items = allItems ?? [];
  const accts = accounts ?? [];

  // MRR breakdown
  const activeItems = items.filter((i) => i.status === "active");
  const trialingItems = items.filter((i) => i.status === "trialing");
  const canceledItems = items.filter((i) => i.status === "canceled");

  const totalMrr = [...activeItems, ...trialingItems].reduce((sum, item) => {
    return sum + (item.price_monthly_cents ?? getPlanConfig(item.plan_id).priceMonthly);
  }, 0);

  const activeAccts = accts.filter((a) => a.status === "active").length;
  const trialingAccts = accts.filter((a) => a.status === "trialing").length;
  const pastDueAccts = accts.filter((a) => a.status === "past_due").length;
  const canceledAccts = accts.filter((a) => a.status === "canceled").length;

  // MRR by plan
  const mrrByPlan: Record<string, { count: number; mrr: number }> = {};
  for (const item of [...activeItems, ...trialingItems]) {
    const planId = item.plan_id ?? "unknown";
    if (!mrrByPlan[planId]) mrrByPlan[planId] = { count: 0, mrr: 0 };
    mrrByPlan[planId].count++;
    mrrByPlan[planId].mrr += item.price_monthly_cents ?? getPlanConfig(planId).priceMonthly;
  }

  // Recent billing activity (last 30 items by updated_at)
  const recentActivity = [...items]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 20);

  const { data: bizNames } = await svc
    .from("businesses")
    .select("id, name")
    .in("id", recentActivity.map((i) => i.business_id));

  const bizNameMap: Record<string, string> = {};
  for (const b of bizNames ?? []) bizNameMap[b.id] = b.name;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Billing</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">Account-level billing overview. All figures are estimates.</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Total MRR",       value: fmt$(totalMrr),   cls: "text-[#166534]" },
          { label: "Active Accounts", value: activeAccts,      cls: "text-[#111827]" },
          { label: "Trialing",        value: trialingAccts,    cls: "text-[#1D4ED8]" },
          { label: "Past Due",        value: pastDueAccts,     cls: "text-[#991B1B]" },
          { label: "Canceled",        value: canceledAccts,    cls: "text-[#6B7280]" },
          { label: "Active Biz",      value: activeItems.length, cls: "text-[#111827]" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-[20px] font-bold leading-none ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* MRR by plan */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[13px] font-bold text-[#111827]">MRR by Plan</h2>
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                {["Plan", "Active Businesses", "MRR"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {Object.entries(mrrByPlan)
                .sort((a, b) => b[1].mrr - a[1].mrr)
                .map(([planId, { count, mrr }]) => (
                  <tr key={planId} className="hover:bg-[#F8FAFD]">
                    <td className="px-4 py-3 font-medium text-[#111827] capitalize">{planId}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{count}</td>
                    <td className="px-4 py-3 font-semibold text-[#166534]">{fmt$(mrr)}</td>
                  </tr>
                ))}
              {Object.keys(mrrByPlan).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[12px] text-[#9CA3AF]">No paid subscriptions yet.</td>
                </tr>
              )}
              {Object.keys(mrrByPlan).length > 0 && (
                <tr className="border-t border-[#E5E5E1] bg-[#F8FAFD]">
                  <td className="px-4 py-3 font-bold text-[#111827]">Total</td>
                  <td className="px-4 py-3 font-bold text-[#111827]">{activeItems.length + trialingItems.length}</td>
                  <td className="px-4 py-3 font-bold text-[#166534]">{fmt$(totalMrr)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Account status breakdown */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[13px] font-bold text-[#111827]">Account Status Breakdown</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Active (paying)", count: activeAccts, color: "#166534", bg: "#DCFCE7" },
              { label: "Trialing (card on file)", count: trialingAccts, color: "#1D4ED8", bg: "#EFF6FF" },
              { label: "Past Due", count: pastDueAccts, color: "#991B1B", bg: "#FEF2F2" },
              { label: "Canceled", count: canceledAccts, color: "#6B7280", bg: "#F3F4F6" },
              { label: "Beta / No Plan", count: accts.filter((a) => a.status === "none").length, color: "#7C3AED", bg: "#F5F3FF" },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[12.5px] text-[#374151]">{label}</span>
                </div>
                <span
                  className="text-[12px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ color, backgroundColor: bg }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent billing activity */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h2 className="text-[13px] font-bold text-[#111827]">Recent Billing Activity</h2>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Last 20 business billing item changes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                {["Business", "Plan", "Status", "Price", "Updated"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {recentActivity.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8FAFD]">
                  <td className="px-4 py-3 font-medium text-[#111827]">
                    {bizNameMap[item.business_id] ?? item.business_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 capitalize text-[#374151]">{item.plan_id}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      item.status === "active" ? "text-[#166534] bg-[#DCFCE7]" :
                      item.status === "trialing" ? "text-[#1D4ED8] bg-[#EFF6FF]" :
                      item.status === "past_due" ? "text-[#991B1B] bg-[#FEF2F2]" :
                      item.status === "canceled" ? "text-[#6B7280] bg-[#F3F4F6]" :
                      "text-[#7C3AED] bg-[#F5F3FF]"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#111827]">
                    {item.price_monthly_cents ? fmt$(item.price_monthly_cents) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{fmtDate(item.updated_at)}</td>
                </tr>
              ))}
              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">No billing activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
