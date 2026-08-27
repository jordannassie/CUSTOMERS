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

const STATUS_STYLES: Record<string, string> = {
  completed: "text-[#15803D] bg-[#F0FDF4]",
  failed:    "text-[#DC2626] bg-[#FEF2F2]",
  running:   "text-[#D97706] bg-[#FFFBEB]",
};

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
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Scans</h1>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-[12px] text-[#9CA3AF]">Total: <strong className="text-[#111827]">{total}</strong></span>
          <span className="text-[12px] text-[#9CA3AF]">Completed: <strong className="text-[#15803D]">{success}</strong></span>
          <span className="text-[12px] text-[#9CA3AF]">Failed: <strong className="text-[#DC2626]">{failed}</strong></span>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                {["Provider", "Business", "Status", "Started", "Duration", "Error"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {(scans ?? []).map((s) => (
                <tr key={s.id} className={`transition-colors ${s.status === "failed" ? "bg-[#FEF9F9] hover:bg-[#FEF2F2]/60" : "hover:bg-[#F8FAFD]"}`}>
                  <td className="px-4 py-3 text-[#111827] font-medium whitespace-nowrap">{s.provider}</td>
                  <td className="px-4 py-3 text-[#6B7280] truncate max-w-[160px]">
                    {/* @ts-expect-error join shape */}
                    {s.businesses?.name ?? s.business_id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] ?? "text-[#9CA3AF] bg-[#F1F5F9]"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] whitespace-nowrap">{fmt(s.created_at)}</td>
                  <td className="px-4 py-3 text-[#9CA3AF] whitespace-nowrap">
                    {duration(s.started_at, s.completed_at)}
                  </td>
                  <td className="px-4 py-3 text-[#DC2626] truncate max-w-[200px]">
                    {s.error ?? <span className="text-[#D1D5DB]">—</span>}
                  </td>
                </tr>
              ))}
              {!scans?.length && (
                <tr><td colSpan={6} className="px-5 py-10 text-[12px] text-[#9CA3AF] text-center">No scans yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
