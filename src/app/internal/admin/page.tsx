import React from "react";
import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function KpiCard({ label, value, sub, icon }: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-semibold text-[#6B7280]">{label}</p>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#0866F5]">
            {icon}
          </div>
        )}
      </div>
      <p className="text-[28px] font-bold text-[#111827] leading-none mb-1">{value}</p>
      {sub && <p className="text-[11px] text-[#9CA3AF] mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const svc = createServiceClient();
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const ago7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers         },
    { count: totalBiz           },
    { count: newBiz7d           },
    { count: totalComp          },
    { count: scans24h           },
    { count: scans7d            },
    { count: failedScans        },
    { count: newFeatureRequests },
  ] = await Promise.all([
    svc.from("profiles").select("*", { count: "exact", head: true }),
    svc.from("businesses").select("*", { count: "exact", head: true }),
    svc.from("businesses").select("*", { count: "exact", head: true }).gte("created_at", ago7d),
    svc.from("business_competitors").select("*", { count: "exact", head: true }),
    svc.from("visibility_runs").select("*", { count: "exact", head: true }).gte("created_at", ago24h),
    svc.from("visibility_runs").select("*", { count: "exact", head: true }).gte("created_at", ago7d),
    svc.from("visibility_runs").select("*", { count: "exact", head: true }).eq("status", "failed"),
    svc.from("feature_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
  ]);

  // Real billing KPIs from billing_accounts + business_billing_items
  const { data: activeItems } = await svc
    .from("business_billing_items")
    .select("plan_id, price_monthly_cents, status")
    .in("status", ["active", "trialing"]);

  const { count: payingAccounts } = await svc
    .from("billing_accounts")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "trialing"]);

  const { count: trialingAccounts } = await svc
    .from("billing_accounts")
    .select("*", { count: "exact", head: true })
    .eq("status", "trialing");

  const { getPlanConfig } = await import("@/config/pricing");
  const totalMrrCents = (activeItems ?? []).reduce((sum, item) => {
    return sum + (item.price_monthly_cents ?? getPlanConfig(item.plan_id).priceMonthly);
  }, 0);

  function fmtMrr(cents: number) {
    if (cents === 0) return "$0";
    return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 20, page: 1 });
  const recentUsers = (authUsers?.users ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const { data: bizCounts } = await svc.from("businesses").select("owner_user_id");
  const bizByUser: Record<string, number> = {};
  for (const b of bizCounts ?? []) {
    bizByUser[b.owner_user_id] = (bizByUser[b.owner_user_id] ?? 0) + 1;
  }

  const { data: recentBiz } = await svc
    .from("businesses")
    .select("id, name, domain, created_at, owner_user_id, profiles(id, account_type)")
    .order("created_at", { ascending: false })
    .limit(10);

  const emailMap: Record<string, string> = {};
  for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email ?? u.id;

  const { data: failures } = await svc
    .from("visibility_runs")
    .select("id, provider, business_id, error, created_at, businesses(name)")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#111827]">Overview</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">Customers.Direct operations at a glance</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Total Users" value={totalUsers ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z"/></svg>}
        />
        <KpiCard
          label="Trialing" value={trialingAccounts ?? 0}
          sub={`+${newBiz7d ?? 0} biz this week`}
          icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm.5 2H7v5l4 2.4.75-1.23-3.25-1.97V5z"/></svg>}
        />
        <KpiCard
          label="Paying Accounts" value={payingAccounts ?? 0}
          sub={`${(activeItems ?? []).length} paid businesses`}
          icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 4h14v9H1V4zm0-2h14v1H1V2zm2 5v1h2V7H3zm0 3v1h4v-1H3zm6-3v4h4V7H9z"/></svg>}
        />
        <KpiCard
          label="MRR" value={fmtMrr(totalMrrCents)}
          sub={totalMrrCents === 0 ? "Beta — no paid subs yet" : `${(activeItems ?? []).filter(i => i.status === "active").length} active businesses`}
          icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10.93V13H7v-1.08A3 3 0 015 9h2a1 1 0 001 1 1 1 0 001-1c0-.55-.45-1-1-1a3 3 0 110-6V2h2v1.07A3 3 0 0111 6H9a1 1 0 10-2 0c0 .55.45 1 1 1a3 3 0 110 6z" opacity="0.85"/></svg>}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard label="AI Scans (24h)"   value={scans24h        ?? 0} />
        <KpiCard label="AI Scans (7d)"    value={scans7d         ?? 0} />
        <KpiCard label="Competitors"      value={totalComp       ?? 0} />
        <KpiCard
          label="Feature Requests" value={newFeatureRequests ?? 0}
          sub={<Link href="/internal/admin/feature-requests" className="text-[#0866F5] hover:underline text-[10px]">View all →</Link>}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Recent signups */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[13px] font-bold text-[#111827]">Recent Signups</h2>
            <Link href="/internal/admin/users" className="text-[11px] text-[#0866F5] hover:underline font-medium">View all</Link>
          </div>
          <div className="divide-y divide-[#F8FAFD]">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFD] transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#0866F5] text-[10px] font-bold shrink-0">
                    {(u.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-[#111827] font-medium truncate">{u.email}</p>
                    <p className="text-[10.5px] text-[#9CA3AF]">{fmt(u.created_at)}</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#9CA3AF] shrink-0 ml-3">
                  {bizByUser[u.id] ?? 0} biz
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="px-5 py-6 text-[12px] text-[#9CA3AF] text-center">No users yet.</p>
            )}
          </div>
        </div>

        {/* Recent businesses */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[13px] font-bold text-[#111827]">Recent Businesses</h2>
            <Link href="/internal/admin/businesses" className="text-[11px] text-[#0866F5] hover:underline font-medium">View all</Link>
          </div>
          <div className="divide-y divide-[#F8FAFD]">
            {(recentBiz ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFD] transition-colors">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-[#111827] font-medium truncate">{b.name}</p>
                  <p className="text-[10.5px] text-[#9CA3AF]">
                    {emailMap[b.owner_user_id] ?? b.owner_user_id} · {b.domain ?? "no domain"}
                  </p>
                </div>
                <span className="text-[10.5px] text-[#9CA3AF] shrink-0 ml-3">{fmt(b.created_at)}</span>
              </div>
            ))}
            {!recentBiz?.length && (
              <p className="px-5 py-6 text-[12px] text-[#9CA3AF] text-center">No businesses yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent failures */}
      {(failures?.length ?? 0) > 0 && (
        <div className="bg-white border border-[#FEE2E2] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#FEF2F2]">
            <h2 className="text-[13px] font-bold text-[#DC2626]">Recent Failures</h2>
            <Link href="/internal/admin/errors" className="text-[11px] text-[#0866F5] hover:underline font-medium">View all</Link>
          </div>
          <div className="divide-y divide-[#FEF9F9]">
            {(failures ?? []).map((f) => (
              <div key={f.id} className="grid grid-cols-[80px_1fr_120px] items-center px-5 py-3 gap-3">
                <span className="text-[11px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full uppercase tracking-wide truncate text-center">
                  {f.provider}
                </span>
                <div className="min-w-0">
                  {/* @ts-expect-error join shape */}
                  <p className="text-[12px] text-[#111827] font-medium truncate">{f.businesses?.name ?? f.business_id}</p>
                  <p className="text-[10.5px] text-[#9CA3AF] truncate">{f.error ?? "No error message"}</p>
                </div>
                <span className="text-[10.5px] text-[#9CA3AF] text-right">{fmt(f.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
