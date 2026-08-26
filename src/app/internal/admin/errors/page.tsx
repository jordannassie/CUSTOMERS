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

  // Error summary by provider
  const byProvider: Record<string, number> = {};
  for (const f of failures ?? []) byProvider[f.provider] = (byProvider[f.provider] ?? 0) + 1;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-[22px] font-bold text-white mb-2">Errors</h1>
      <p className="text-[12px] text-white/30 mb-8">{failures?.length ?? 0} failed scans recorded</p>

      {/* Provider summary */}
      {Object.keys(byProvider).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-8">
          {Object.entries(byProvider).sort((a, b) => b[1] - a[1]).map(([prov, count]) => (
            <div key={prov} className="bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
              <p className="text-[11px] text-red-400 font-bold uppercase tracking-wide">{prov}</p>
              <p className="text-[22px] font-bold text-white">{count}</p>
              <p className="text-[10px] text-white/30">failures</p>
            </div>
          ))}
        </div>
      )}

      {/* Error table */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-white/8 bg-[#0F172A]/50">
                {["Provider", "Business", "Error", "Time"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(failures ?? []).map((f) => (
                <tr key={f.id} className="hover:bg-white/2">
                  <td className="px-5 py-3 text-red-400 font-medium whitespace-nowrap">{f.provider}</td>
                  <td className="px-5 py-3 text-white/60 truncate max-w-[160px]">
                    {/* @ts-expect-error join shape */}
                    {f.businesses?.name ?? f.business_id}
                  </td>
                  <td className="px-5 py-3 text-white/50 max-w-[300px]">
                    <p className="truncate" title={f.error ?? ""}>{f.error ?? "No error message"}</p>
                  </td>
                  <td className="px-5 py-3 text-white/30 whitespace-nowrap">{fmt(f.created_at)}</td>
                </tr>
              ))}
              {!failures?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[12px] text-emerald-400">
                    No failures recorded. 🎉
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
