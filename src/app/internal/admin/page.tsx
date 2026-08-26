import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1E293B] border border-white/8 rounded-xl p-5">
      <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[28px] font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
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
    { count: totalUsers   },
    { count: totalBiz     },
    { count: newBiz7d     },
    { count: totalComp    },
    { count: scans24h     },
    { count: scans7d      },
    { count: failedScans  },
  ] = await Promise.all([
    svc.from("profiles").select("*", { count: "exact", head: true }),
    svc.from("businesses").select("*", { count: "exact", head: true }),
    svc.from("businesses").select("*", { count: "exact", head: true }).gte("created_at", ago7d),
    svc.from("business_competitors").select("*", { count: "exact", head: true }),
    svc.from("visibility_runs").select("*", { count: "exact", head: true }).gte("created_at", ago24h),
    svc.from("visibility_runs").select("*", { count: "exact", head: true }).gte("created_at", ago7d),
    svc.from("visibility_runs").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  // Recent signups — use service role admin API
  const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 20, page: 1 });
  const recentUsers = (authUsers?.users ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // Business counts per user
  const { data: bizCounts } = await svc
    .from("businesses")
    .select("owner_user_id");
  const bizByUser: Record<string, number> = {};
  for (const b of bizCounts ?? []) {
    bizByUser[b.owner_user_id] = (bizByUser[b.owner_user_id] ?? 0) + 1;
  }

  // Recent businesses
  const { data: recentBiz } = await svc
    .from("businesses")
    .select("id, name, domain, created_at, owner_user_id, profiles(id, account_type)")
    .order("created_at", { ascending: false })
    .limit(10);

  // Profile emails (from auth users map)
  const emailMap: Record<string, string> = {};
  for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email ?? u.id;

  // Recent failures
  const { data: failures } = await svc
    .from("visibility_runs")
    .select("id, provider, business_id, error, created_at, businesses(name)")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-white">Overview</h1>
        <p className="text-[12px] text-white/30 mt-1">Live operational snapshot · {now.toLocaleString()}</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <KpiCard label="Total Users"     value={totalUsers   ?? 0} />
        <KpiCard label="Total Businesses" value={totalBiz    ?? 0} sub={`+${newBiz7d ?? 0} this week`} />
        <KpiCard label="Competitors"     value={totalComp    ?? 0} />
        <KpiCard label="Failed Scans"    value={failedScans  ?? 0} sub="all time" />
        <KpiCard label="AI Scans (24h)"  value={scans24h     ?? 0} />
        <KpiCard label="AI Scans (7d)"   value={scans7d      ?? 0} />
        <KpiCard label="Beta Users"      value={totalUsers   ?? 0} sub="all access is free beta" />
        <KpiCard label="New Biz (7d)"    value={newBiz7d     ?? 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Recent signups */}
        <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h2 className="text-[13px] font-bold text-white">Recent Signups</h2>
            <Link href="/internal/admin/users" className="text-[11px] text-[#0866F5] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-white truncate">{u.email}</p>
                  <p className="text-[10.5px] text-white/30">{fmt(u.created_at)}</p>
                </div>
                <span className="text-[11px] text-white/40 shrink-0 ml-3">
                  {bizByUser[u.id] ?? 0} biz
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="px-5 py-4 text-[12px] text-white/30">No users yet.</p>
            )}
          </div>
        </div>

        {/* Recent businesses */}
        <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h2 className="text-[13px] font-bold text-white">Recent Businesses</h2>
            <Link href="/internal/admin/businesses" className="text-[11px] text-[#0866F5] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-white/5">
            {(recentBiz ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-white truncate">{b.name}</p>
                  <p className="text-[10.5px] text-white/30">
                    {emailMap[b.owner_user_id] ?? b.owner_user_id} · {b.domain ?? "no domain"}
                  </p>
                </div>
                <span className="text-[10.5px] text-white/30 shrink-0 ml-3">{fmt(b.created_at)}</span>
              </div>
            ))}
            {!recentBiz?.length && (
              <p className="px-5 py-4 text-[12px] text-white/30">No businesses yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent failures */}
      {(failures?.length ?? 0) > 0 && (
        <div className="bg-[#1E293B] border border-red-900/40 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h2 className="text-[13px] font-bold text-red-400">Recent Failures</h2>
            <Link href="/internal/admin/errors" className="text-[11px] text-[#0866F5] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-white/5">
            {(failures ?? []).map((f) => (
              <div key={f.id} className="grid grid-cols-[80px_1fr_120px] items-center px-5 py-3 gap-3">
                <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wide truncate">{f.provider}</span>
                <div className="min-w-0">
                  {/* @ts-expect-error join shape */}
                  <p className="text-[12px] text-white truncate">{f.businesses?.name ?? f.business_id}</p>
                  <p className="text-[10.5px] text-white/30 truncate">{f.error ?? "No error message"}</p>
                </div>
                <span className="text-[10.5px] text-white/30 text-right">{fmt(f.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
