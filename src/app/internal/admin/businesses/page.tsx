import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminBusinessesPage() {
  await requireAdmin();
  const svc = createServiceClient();

  const { data: businesses } = await svc
    .from("businesses")
    .select("id, name, domain, city, region, country, status, created_at, owner_user_id")
    .order("created_at", { ascending: false });

  // Get user emails
  const { data: authData } = await svc.auth.admin.listUsers({ perPage: 200, page: 1 });
  const emailMap = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u.email ?? u.id]));

  // Competitor counts
  const { data: compCounts } = await svc.from("business_competitors").select("business_id");
  const compByBiz: Record<string, number> = {};
  for (const c of compCounts ?? []) compByBiz[c.business_id] = (compByBiz[c.business_id] ?? 0) + 1;

  // Prompt counts
  const { data: promptCounts } = await svc.from("tracked_prompts").select("business_id");
  const promptByBiz: Record<string, number> = {};
  for (const p of promptCounts ?? []) promptByBiz[p.business_id] = (promptByBiz[p.business_id] ?? 0) + 1;

  // Latest scan per business
  const { data: latestScans } = await svc
    .from("visibility_runs")
    .select("business_id, status, created_at")
    .order("created_at", { ascending: false });
  const latestScanByBiz: Record<string, { status: string; created_at: string }> = {};
  for (const s of latestScans ?? []) {
    if (!latestScanByBiz[s.business_id]) latestScanByBiz[s.business_id] = s;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-[22px] font-bold text-white mb-2">Businesses</h1>
      <p className="text-[12px] text-white/30 mb-8">{businesses?.length ?? 0} total</p>

      <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-white/8 bg-[#0F172A]/50">
                {["Business", "Owner", "Domain", "Location", "Competitors", "Prompts", "Last Scan", "Created"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10.5px] font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(businesses ?? []).map((b) => {
                const scan = latestScanByBiz[b.id];
                return (
                  <tr key={b.id} className="hover:bg-white/2">
                    <td className="px-4 py-3">
                      <Link
                        href={`/internal/admin/businesses/${b.id}`}
                        className="text-[#60A5FA] hover:underline font-medium truncate max-w-[160px] block"
                      >
                        {b.name}
                      </Link>
                      {b.status === "onboarding" && (
                        <span className="text-[9px] text-yellow-400">onboarding</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/40 truncate max-w-[180px]">
                      {emailMap[b.owner_user_id] ?? b.owner_user_id}
                    </td>
                    <td className="px-4 py-3 text-white/50 truncate max-w-[140px]">
                      {b.domain ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/40 whitespace-nowrap">
                      {[b.city, b.region, b.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-center">{compByBiz[b.id] ?? 0}</td>
                    <td className="px-4 py-3 text-white/50 text-center">{promptByBiz[b.id] ?? 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {scan ? (
                        <span className={scan.status === "failed" ? "text-red-400" : "text-emerald-400"}>
                          {fmt(scan.created_at)}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-white/30 whitespace-nowrap">{fmt(b.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
