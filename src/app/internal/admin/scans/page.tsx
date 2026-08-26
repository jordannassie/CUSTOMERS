import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function duration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function AdminScansPage() {
  await requireAdmin();
  const svc = createServiceClient();

  const { data: scans } = await svc
    .from("visibility_runs")
    .select("id, provider, status, error, started_at, completed_at, created_at, business_id, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const total   = scans?.length ?? 0;
  const failed  = scans?.filter((s) => s.status === "failed").length ?? 0;
  const success = scans?.filter((s) => s.status === "completed").length ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-[22px] font-bold text-white mb-2">Scans</h1>
      <div className="flex items-center gap-6 text-[12px] text-white/40 mb-8">
        <span>Total: <strong className="text-white">{total}</strong></span>
        <span>Completed: <strong className="text-emerald-400">{success}</strong></span>
        <span>Failed: <strong className="text-red-400">{failed}</strong></span>
      </div>

      <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-white/8 bg-[#0F172A]/50">
                {["Provider", "Business", "Status", "Started", "Duration", "Error"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10.5px] font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(scans ?? []).map((s) => (
                <tr key={s.id} className={`hover:bg-white/2 ${s.status === "failed" ? "bg-red-900/8" : ""}`}>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{s.provider}</td>
                  <td className="px-4 py-3 text-white/60 truncate max-w-[160px]">
                    {/* @ts-expect-error join shape */}
                    {s.businesses?.name ?? s.business_id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-bold uppercase ${
                      s.status === "failed"    ? "text-red-400" :
                      s.status === "completed" ? "text-emerald-400" :
                      s.status === "running"   ? "text-yellow-400" :
                      "text-white/40"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white/30 whitespace-nowrap">{fmt(s.created_at)}</td>
                  <td className="px-4 py-3 text-white/40 whitespace-nowrap">
                    {duration(s.started_at, s.completed_at)}
                  </td>
                  <td className="px-4 py-3 text-red-400 truncate max-w-[200px]">
                    {s.error ?? "—"}
                  </td>
                </tr>
              ))}
              {!scans?.length && (
                <tr><td colSpan={6} className="px-5 py-8 text-[12px] text-white/30 text-center">No scans yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
