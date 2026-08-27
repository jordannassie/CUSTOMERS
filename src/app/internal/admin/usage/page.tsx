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

  const byProvider: Record<string, { total: number; completed: number; failed: number; last7d: number }> = {};
  for (const r of allRuns ?? []) {
    if (!byProvider[r.provider]) byProvider[r.provider] = { total: 0, completed: 0, failed: 0, last7d: 0 };
    byProvider[r.provider].total++;
    if (r.status === "completed") byProvider[r.provider].completed++;
    if (r.status === "failed")    byProvider[r.provider].failed++;
    if (r.created_at >= ago7d)    byProvider[r.provider].last7d++;
  }

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

  const maxBar = Math.max(...Object.values(dayBuckets), 1);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Usage</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">AI provider request counts (DataForSEO and Google Places usage is not stored per-request)</p>
      </div>

      {/* Provider breakdown */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden mb-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h2 className="text-[13px] font-bold text-[#111827]">By Provider</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                {["Provider", "Total Requests", "Completed", "Failed", "Last 7 Days"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {Object.entries(byProvider).sort((a, b) => b[1].total - a[1].total).map(([prov, stats]) => (
                <tr key={prov} className="hover:bg-[#F8FAFD] transition-colors">
                  <td className="px-5 py-3 text-[#111827] font-medium">{prov}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{stats.total}</td>
                  <td className="px-5 py-3 text-[#15803D] font-medium">{stats.completed}</td>
                  <td className="px-5 py-3">
                    {stats.failed > 0
                      ? <span className="text-[#DC2626] font-medium">{stats.failed}</span>
                      : <span className="text-[#D1D5DB]">—</span>}
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF]">{stats.last7d}</td>
                </tr>
              ))}
              {Object.keys(byProvider).length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-[12px] text-[#9CA3AF] text-center">No usage data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily scan volume */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 mb-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 className="text-[13px] font-bold text-[#111827] mb-4">Daily Scan Volume (last 14 days)</h2>
        <div className="flex items-end gap-1.5 h-28">
          {Object.entries(dayBuckets).map(([day, count]) => {
            const pct = count / maxBar;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1" title={`${day}: ${count}`}>
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${Math.max(pct * 96, count > 0 ? 4 : 0)}px`,
                    backgroundColor: count > 0 ? "#0866F5" : "#E2E8F0",
                  }}
                />
                <span className="text-[7.5px] text-[#9CA3AF] hidden sm:block">{day.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top businesses */}
      {sortedBiz.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[13px] font-bold text-[#111827]">Top Businesses by Scan Count (30d)</h2>
          </div>
          <div className="divide-y divide-[#F8FAFD]">
            {sortedBiz.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFD] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#D1D5DB] w-5 font-mono">{i + 1}</span>
                  <span className="text-[12.5px] text-[#111827] font-medium">{b.name}</span>
                </div>
                <span className="text-[12px] font-semibold text-[#6B7280]">{b.count} scans</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
