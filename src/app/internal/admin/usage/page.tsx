import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata = { title: "Admin — Usage" };

function fmtUsd(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export default async function AdminUsagePage() {
  await requireAdmin();
  const svc = createServiceClient();

  const now = new Date();
  const ago7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── Existing visibility_runs (for backward compat) ────────────────────────
  const { data: allRuns } = await svc
    .from("visibility_runs")
    .select("provider, status, created_at, business_id, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(2000);

  const byProvider: Record<string, { total: number; completed: number; failed: number; last7d: number }> = {};
  const dayBuckets: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = 0;
  }

  for (const r of allRuns ?? []) {
    if (!byProvider[r.provider]) byProvider[r.provider] = { total: 0, completed: 0, failed: 0, last7d: 0 };
    byProvider[r.provider].total++;
    if (r.status === "completed") byProvider[r.provider].completed++;
    if (r.status === "failed")    byProvider[r.provider].failed++;
    if (r.created_at >= ago7d)    byProvider[r.provider].last7d++;
    const day = r.created_at.slice(0, 10);
    if (day in dayBuckets) dayBuckets[day]++;
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
  const maxBar = Math.max(...Object.values(dayBuckets), 1);

  // ── Usage events (new ledger) ──────────────────────────────────────────────
  const { data: usageEvents } = await svc
    .from("usage_events")
    .select("usage_type, provider, model, quantity, input_tokens, output_tokens, request_count, estimated_cost_usd, created_at, business_id")
    .gte("created_at", ago30d)
    .order("created_at", { ascending: false })
    .limit(5000);

  const events = usageEvents ?? [];

  // By provider (usage_events)
  const ledgerByProvider: Record<string, {
    provider: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }> = {};

  // By type
  const ledgerByType: Record<string, { type: string; requests: number; costUsd: number }> = {};

  let totalLedgerCost = 0;
  let totalAiChecks = 0;

  for (const e of events) {
    totalLedgerCost += Number(e.estimated_cost_usd ?? 0);

    if (e.usage_type === "ai_visibility_check") totalAiChecks += e.quantity ?? 1;

    if (e.provider) {
      if (!ledgerByProvider[e.provider]) {
        ledgerByProvider[e.provider] = { provider: e.provider, requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      }
      ledgerByProvider[e.provider].requests += e.request_count ?? 1;
      ledgerByProvider[e.provider].inputTokens += Number(e.input_tokens ?? 0);
      ledgerByProvider[e.provider].outputTokens += Number(e.output_tokens ?? 0);
      ledgerByProvider[e.provider].costUsd += Number(e.estimated_cost_usd ?? 0);
    }

    if (!ledgerByType[e.usage_type]) {
      ledgerByType[e.usage_type] = { type: e.usage_type, requests: 0, costUsd: 0 };
    }
    ledgerByType[e.usage_type].requests += e.request_count ?? 1;
    ledgerByType[e.usage_type].costUsd += Number(e.estimated_cost_usd ?? 0);
  }

  const hasLedgerData = events.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Usage</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">AI provider usage, scan activity, and cost tracking (30-day window).</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total AI Checks (30d)", value: totalAiChecks.toLocaleString() },
          { label: "Visibility Runs (30d)", value: Object.values(bizUsage).reduce((s, b) => s + b.count, 0).toLocaleString() },
          { label: "Est. Provider Cost (30d)", value: hasLedgerData ? `$${totalLedgerCost.toFixed(4)}` : "—" },
          { label: "Usage Events Tracked", value: events.length.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-[20px] font-bold text-[#111827]">{value}</p>
          </div>
        ))}
      </div>

      {/* Usage ledger — by provider (new) */}
      {hasLedgerData && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden mb-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[13px] font-bold text-[#111827]">By Provider (Usage Ledger — 30d)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                  {["Provider", "Requests", "Input Tokens", "Output Tokens", "Est. Cost"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFD]">
                {Object.values(ledgerByProvider)
                  .sort((a, b) => b.costUsd - a.costUsd)
                  .map((p) => (
                    <tr key={p.provider} className="hover:bg-[#F8FAFD]">
                      <td className="px-5 py-3 font-medium text-[#111827] capitalize">{p.provider}</td>
                      <td className="px-5 py-3 text-[#6B7280]">{p.requests.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[#6B7280]">{p.inputTokens.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[#6B7280]">{p.outputTokens.toLocaleString()}</td>
                      <td className="px-5 py-3 font-semibold text-[#111827]">{fmtUsd(p.costUsd)}</td>
                    </tr>
                  ))}
                <tr className="bg-[#F8FAFD] border-t border-[#E2E8F0]">
                  <td className="px-5 py-3 font-bold text-[#111827]" colSpan={4}>Total</td>
                  <td className="px-5 py-3 font-bold text-[#111827]">{fmtUsd(totalLedgerCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage ledger — by type */}
      {hasLedgerData && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden mb-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-4 border-b border-[#F1F5F9]">
            <h2 className="text-[13px] font-bold text-[#111827]">By Usage Type (30d)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                  {["Usage Type", "Requests", "Est. Cost"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFD]">
                {Object.values(ledgerByType)
                  .sort((a, b) => b.costUsd - a.costUsd)
                  .map((t) => (
                    <tr key={t.type} className="hover:bg-[#F8FAFD]">
                      <td className="px-5 py-3 font-medium text-[#111827]">{t.type.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-[#6B7280]">{t.requests.toLocaleString()}</td>
                      <td className="px-5 py-3 font-semibold text-[#111827]">{fmtUsd(t.costUsd)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasLedgerData && (
        <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-6 mb-6 text-center">
          <p className="text-[13px] text-[#9CA3AF]">No usage events recorded yet.</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Usage events will appear here once AI visibility checks are instrumented.</p>
        </div>
      )}

      {/* Visibility runs by provider (existing) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden mb-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h2 className="text-[13px] font-bold text-[#111827]">Visibility Runs by Provider</h2>
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
                <tr><td colSpan={5} className="px-5 py-8 text-[12px] text-[#9CA3AF] text-center">No visibility runs yet.</td></tr>
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
