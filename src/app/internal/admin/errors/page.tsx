import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminErrorsPage() {
  await requireAdmin();
  const svc = createServiceClient();

  const { data: failures } = await svc
    .from("visibility_runs")
    .select("id, provider, status, error, created_at, business_id, businesses(name)")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(100);

  const byProvider: Record<string, number> = {};
  for (const f of failures ?? []) byProvider[f.provider] = (byProvider[f.provider] ?? 0) + 1;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Errors</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">{failures?.length ?? 0} failed scans recorded</p>
      </div>

      {/* Provider summary */}
      {Object.keys(byProvider).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-8">
          {Object.entries(byProvider).sort((a, b) => b[1] - a[1]).map(([prov, count]) => (
            <div key={prov} className="bg-white border border-[#FEE2E2] rounded-2xl px-5 py-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <p className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wide mb-1">{prov}</p>
              <p className="text-[26px] font-bold text-[#111827] leading-none">{count}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">failures</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                {["Provider", "Business", "Error", "Time"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {(failures ?? []).map((f) => (
                <tr key={f.id} className="hover:bg-[#FEF9F9] transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                      {f.provider}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#6B7280] truncate max-w-[160px]">
                    {/* @ts-expect-error join shape */}
                    {f.businesses?.name ?? f.business_id}
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF] max-w-[300px]">
                    <p className="truncate" title={f.error ?? ""}>{f.error ?? "No error message"}</p>
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF] whitespace-nowrap">{fmt(f.created_at)}</td>
                </tr>
              ))}
              {!failures?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[12px] text-[#15803D] font-medium">
                    No failures recorded.
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
