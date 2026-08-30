import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";
import { getPlanConfig } from "@/config/pricing";

export const metadata = { title: "Admin — Accounts" };

function fmt$(cents: number): string {
  return `$${(cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  active:   "text-[#166534] bg-[#DCFCE7]",
  trialing: "text-[#1D4ED8] bg-[#EFF6FF]",
  past_due: "text-[#991B1B] bg-[#FEF2F2]",
  canceled: "text-[#6B7280] bg-[#F3F4F6]",
  beta:     "text-[#7C3AED] bg-[#F5F3FF]",
  none:     "text-[#6B7280] bg-[#F3F4F6]",
};

export default async function AdminAccountsPage() {
  await requireAdmin();
  const svc = createServiceClient();

  // Load all billing accounts
  const { data: accounts } = await svc
    .from("billing_accounts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  // Load all business billing items
  const { data: allItems } = await svc
    .from("business_billing_items")
    .select("billing_account_id, plan_id, status, price_monthly_cents");

  // Build per-account summaries
  const itemsByAccount: Record<string, typeof allItems> = {};
  for (const item of allItems ?? []) {
    if (!itemsByAccount[item.billing_account_id]) itemsByAccount[item.billing_account_id] = [];
    itemsByAccount[item.billing_account_id]!.push(item);
  }

  // Load auth users for email lookup
  const { data: authData } = await svc.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) emailMap[u.id] = u.email ?? u.id;

  // Compute totals
  let totalMrr = 0;
  let activeAccounts = 0;
  let trialingAccounts = 0;
  let pastDueAccounts = 0;

  const accountRows = (accounts ?? []).map((ba) => {
    const items = itemsByAccount[ba.id] ?? [];
    const activeItems = items.filter((i) => i.status === "active" || i.status === "trialing");
    const mrr = activeItems.reduce((sum, item) => {
      return sum + (item.price_monthly_cents ?? getPlanConfig(item.plan_id).priceMonthly);
    }, 0);
    totalMrr += mrr;
    if (ba.status === "active") activeAccounts++;
    if (ba.status === "trialing") trialingAccounts++;
    if (ba.status === "past_due") pastDueAccounts++;
    return { ...ba, items, activeBusinessCount: activeItems.length, mrr };
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Accounts</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">
          One account per auth user. One Stripe customer. One consolidated invoice.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Accounts", value: accountRows.length },
          { label: "Active", value: activeAccounts, cls: "text-[#166534]" },
          { label: "Trialing", value: trialingAccounts, cls: "text-[#1D4ED8]" },
          { label: "Past Due", value: pastDueAccounts, cls: "text-[#991B1B]" },
          { label: "Total MRR", value: fmt$(totalMrr), cls: "text-[#111827]" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-[22px] font-bold ${cls ?? "text-[#111827]"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Accounts table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h2 className="text-[13px] font-bold text-[#111827]">All Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                {["Email", "Status", "Businesses", "MRR", "Trial Ends", "Created", "Stripe Customer", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {accountRows.map((ba) => {
                const email = emailMap[ba.user_id] ?? ba.user_id;
                const statusStyle = STATUS_STYLES[ba.status] ?? STATUS_STYLES.none;
                return (
                  <tr key={ba.id} className="hover:bg-[#F8FAFD] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#111827] truncate max-w-[200px]">{email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusStyle}`}>
                        {ba.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {ba.activeBusinessCount} / {ba.items.length} active
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#111827]">
                      {ba.mrr > 0 ? fmt$(ba.mrr) : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{fmtDate(ba.trial_ends_at)}</td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{fmtDate(ba.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9CA3AF]">
                      {ba.stripe_customer_id
                        ? <span title={ba.stripe_customer_id}>{ba.stripe_customer_id.slice(0, 14)}…</span>
                        : <span className="text-[#E5E5E1]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/internal/admin/businesses?user=${ba.user_id}`}
                        className="text-[11px] text-[#0866F5] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {accountRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">
                    No accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
