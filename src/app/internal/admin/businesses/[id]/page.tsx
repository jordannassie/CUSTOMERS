import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";
import { notFound } from "next/navigation";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-white/5">
      <span className="text-[11.5px] text-white/30 w-36 shrink-0">{label}</span>
      <span className="text-[12.5px] text-white/80 min-w-0 break-all">{value ?? "—"}</span>
    </div>
  );
}

export default async function AdminBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const svc = createServiceClient();

  const { data: biz } = await svc
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!biz) notFound();

  const { data: authUser } = await svc.auth.admin.getUserById(biz.owner_user_id);

  const [
    { data: competitors },
    { data: prompts },
    { data: scans },
    { data: opps },
  ] = await Promise.all([
    svc.from("business_competitors").select("id, name, domain, source, enrichment_status, created_at").eq("business_id", id).order("created_at", { ascending: false }),
    svc.from("tracked_prompts").select("id, prompt_text, active, created_at").eq("business_id", id).order("created_at", { ascending: false }),
    svc.from("visibility_runs").select("id, provider, status, error, started_at, completed_at, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
    svc.from("opportunities").select("id, title, status, impact, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/internal/admin/businesses" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
          ← Businesses
        </Link>
        <h1 className="text-[22px] font-bold text-white mt-2">{biz.name}</h1>
        <p className="text-[12px] text-white/30 mt-1">{authUser?.user?.email ?? biz.owner_user_id}</p>
      </div>

      {/* Profile */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl p-5 mb-6">
        <h2 className="text-[13px] font-bold text-white mb-3">Business Profile</h2>
        <Row label="ID"         value={biz.id} />
        <Row label="Domain"     value={biz.domain} />
        <Row label="Status"     value={biz.status} />
        <Row label="City"       value={biz.city} />
        <Row label="Region"     value={biz.region} />
        <Row label="Country"    value={biz.country} />
        <Row label="Category"   value={biz.category} />
        <Row label="Created"    value={fmt(biz.created_at)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Competitors */}
        <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
          <h2 className="text-[13px] font-bold text-white px-5 py-4 border-b border-white/8">
            Competitors ({competitors?.length ?? 0})
          </h2>
          <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
            {(competitors ?? []).map((c) => (
              <div key={c.id} className="px-5 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-white">{c.name}</p>
                  <p className="text-[10.5px] text-white/30">{c.domain ?? "no domain"}</p>
                </div>
                <span className="text-[10px] text-white/30">{c.source}</span>
              </div>
            ))}
            {!competitors?.length && <p className="px-5 py-3 text-[12px] text-white/30">None</p>}
          </div>
        </div>

        {/* Prompts */}
        <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
          <h2 className="text-[13px] font-bold text-white px-5 py-4 border-b border-white/8">
            Prompts ({prompts?.length ?? 0})
          </h2>
          <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
            {(prompts ?? []).map((p) => (
              <div key={p.id} className="px-5 py-2.5">
                <p className="text-[12px] text-white truncate">{p.prompt_text}</p>
                <p className="text-[10.5px] text-white/30">{p.active ? "active" : "inactive"}</p>
              </div>
            ))}
            {!prompts?.length && <p className="px-5 py-3 text-[12px] text-white/30">None</p>}
          </div>
        </div>
      </div>

      {/* Scans */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden mb-6">
        <h2 className="text-[13px] font-bold text-white px-5 py-4 border-b border-white/8">
          Recent Scans
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/5 bg-[#0F172A]/40">
                {["Provider", "Status", "Started", "Error"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(scans ?? []).map((s) => (
                <tr key={s.id} className={s.status === "failed" ? "bg-red-900/10" : ""}>
                  <td className="px-4 py-2.5 text-white/70">{s.provider}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold uppercase ${
                      s.status === "failed" ? "text-red-400" :
                      s.status === "completed" ? "text-emerald-400" :
                      "text-yellow-400"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white/30 whitespace-nowrap">{fmt(s.created_at)}</td>
                  <td className="px-4 py-2.5 text-red-400 truncate max-w-[200px]">{s.error ?? "—"}</td>
                </tr>
              ))}
              {!scans?.length && (
                <tr><td colSpan={4} className="px-4 py-4 text-[12px] text-white/30">No scans yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunities */}
      <div className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
        <h2 className="text-[13px] font-bold text-white px-5 py-4 border-b border-white/8">
          Opportunities ({opps?.length ?? 0})
        </h2>
        <div className="divide-y divide-white/5">
          {(opps ?? []).map((o) => (
            <div key={o.id} className="px-5 py-2.5 flex items-center justify-between">
              <p className="text-[12px] text-white truncate">{o.title}</p>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-[10px] text-white/30">{o.impact}</span>
                <span className="text-[10px] font-semibold text-white/50">{o.status}</span>
              </div>
            </div>
          ))}
          {!opps?.length && <p className="px-5 py-3 text-[12px] text-white/30">None</p>}
        </div>
      </div>
    </div>
  );
}
