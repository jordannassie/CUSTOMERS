import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const svc = createServiceClient();

  const { data: authData } = await svc.auth.admin.listUsers({ perPage: 200, page: 1 });
  const users = authData?.users ?? [];

  const { data: profiles } = await svc.from("profiles").select("id, account_type, active_business_id");
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const { data: bizList } = await svc.from("businesses").select("id, owner_user_id, name");
  const bizByUser: Record<string, { id: string; name: string }[]> = {};
  for (const b of bizList ?? []) {
    if (!bizByUser[b.owner_user_id]) bizByUser[b.owner_user_id] = [];
    bizByUser[b.owner_user_id].push({ id: b.id, name: b.name });
  }

  const sorted = [...users].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827]">Users</h1>
        <p className="text-[12px] text-[#9CA3AF] mt-1">{sorted.length} total accounts</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFD]">
                {["Email", "Account Type", "Businesses", "Signed Up", "Last Sign In"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFD]">
              {sorted.map((u) => {
                const profile = profileMap[u.id];
                const businesses = bizByUser[u.id] ?? [];
                const isAdmin = profile?.account_type === "admin";
                return (
                  <tr key={u.id} className={`hover:bg-[#F8FAFD] transition-colors ${isAdmin ? "bg-[#EFF6FF]/40" : ""}`}>
                    <td className="px-5 py-3 text-[#111827] font-medium truncate max-w-[220px]">
                      {u.email}
                      {isAdmin && (
                        <span className="ml-2 text-[9px] font-bold bg-[#EFF6FF] text-[#0866F5] px-1.5 py-0.5 rounded uppercase tracking-wide">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#6B7280]">
                      {profile?.account_type ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      {businesses.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {businesses.map((b) => (
                            <a
                              key={b.id}
                              href="/internal/admin/businesses"
                              className="text-[#0866F5] hover:underline truncate max-w-[180px] block"
                            >
                              {b.name}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#9CA3AF] whitespace-nowrap">
                      {fmt(u.created_at)}
                    </td>
                    <td className="px-5 py-3 text-[#9CA3AF] whitespace-nowrap">
                      {u.last_sign_in_at ? fmt(u.last_sign_in_at) : "—"}
                    </td>
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
