import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";

export default async function AdminUsagePage() {
  await requireAdmin();
  const svc = createServiceClient();

  const now = new Date();
  const ago7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: allRuns } = await svc
    .from("visibility_runs")
    .select("provider, status, created_at, business_id, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(1000);

  // Aggregate by provider
  const byProvider: Record<string, { total: number; completed: number; failed: number; last7d: number }> = {};
  for (const r of allRuns ?? []) {
    if (!byProvider[r.provider]) byProvider[r.provider] = { total: 0, completed: 0, failed: 0, last7d: 0 };
    byProvider[r.provider].total++;
    if (r.status === "completed") byProvider[r.provider].completed++;
    if (r.status === "failed")    byProvider[r.provider].failed++;
    if (r.created_at >= ago7d)    byProvider[r.provider].last7d++;
  }

  // Usage by business (30d)
  const bizUsage: Record<string, { name: string; count: number }> = {};
  for (const r of allRuns ?? []) {
    if (r.created_at < ago30d) continue;
    const bizId = r.business_id;
    if (!bizUsage[bizId]) {
      // @ts-expect-error join shape
      bizUsage[bizId] = { name: r.businesses?.name ?? bizId, count: 0 };
    }
    bizUsage[bizId].count++;
  }

  const sortedBiz = Object.values(bizUsage).sort((a, b) => b.count - a.count).slice(0, 20);

  // Scans per day (last 14 days)
  const dayBuckets: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of allRuns ?? []) {
    const day = r.created_at.slice(0, 10);
    if (day in dayBuckets) dayBuckets[day]++;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-[22px] font-bold text-white mb-2">Usage</h1>
      <p className="text-[12px] text-white/30 mb-8">AI provider request counts (DataForSEO and Google Places usage is not stored per-request)</p>

      {/* Provider breakdown */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden mb-8">
        <h2 className="text-[13px] font-bold text-white px-5 py-4 border-b border-white/8">By Provider</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-white/5 bg-[#0F172A]/40">
                {["Provider", "Total Requests", "Completed", "Failed", "Last 7 Days"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(byProvider).sort((a, b) => b[1].total - a[1].total).map(([prov, stats]) => (
                <tr key={prov} className="hover:bg-white/2">
                  <td className="px-5 py-3 text-white font-medium">{prov}</td>
                  <td className="px-5 py-3 text-white/70">{stats.total}</td>
                  <td className="px-5 py-3 text-emerald-400">{stats.completed}</td>
                  <td className="px-5 py-3 text-red-400">{stats.failed > 0 ? stats.failed : "—"}</td>
                  <td className="px-5 py-3 text-white/50">{stats.last7d}</td>
                </tr>
              ))}
              {Object.keys(byProvider).length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-[12px] text-white/30 text-center">No usage data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily scan volume */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl p-5 mb-8">
        <h2 className="text-[13px] font-bold text-white mb-4">Daily Scan Volume (last 14 days)</h2>
        <div className="flex items-end gap-1.5 h-24">
          {Object.entries(dayBuckets).map(([day, count]) => {
            const maxVal = Math.max(...Object.values(dayBuckets), 1);
            const pct = count / maxVal;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1" title={`${day}: ${count}`}>
                <div
                  className="w-full bg-[#0866F5]/70 rounded-t"
                  style={{ height: `${Math.max(pct * 80, count > 0 ? 4 : 0)}px` }}
                />
                <span className="text-[8px] text-white/20 rotate-90 origin-center mt-2 hidden sm:block">
                  {day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top businesses by usage (30d) */}
      {sortedBiz.length > 0 && (
        <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
          <h2 className="text-[13px] font-bold text-white px-5 py-4 border-b border-white/8">
            Top Businesses by Scan Count (30d)
          </h2>
          <div className="divide-y divide-white/5">
            {sortedBiz.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/20 w-5">{i + 1}</span>
                  <span className="text-[12.5px] text-white">{b.name}</span>
                </div>
                <span className="text-[12px] font-bold text-white/50">{b.count} scans</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
