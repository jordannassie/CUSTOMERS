import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import FeatureRequestsClient from "./FeatureRequestsClient";

export const metadata = { title: "Feature Requests | Admin", robots: { index: false } };

export default async function AdminFeatureRequestsPage() {
  await requireAdmin();

  const svc = createServiceClient();

  // Fetch all feature requests with business name via join
  const { data: requests } = await svc
    .from("feature_requests")
    .select(`
      id,
      user_id,
      business_id,
      title,
      description,
      page_context,
      status,
      created_at,
      businesses ( name, domain )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  // Get user emails for each unique user_id
  const userIds = [...new Set((requests ?? []).map((r) => r.user_id))];
  const emailMap: Record<string, string> = {};
  for (const uid of userIds) {
    try {
      const { data } = await svc.auth.admin.getUserById(uid);
      if (data.user?.email) emailMap[uid] = data.user.email;
    } catch {
      // skip
    }
  }

  const enriched = (requests ?? []).map((r) => ({
    id:          r.id as string,
    userId:      r.user_id as string,
    businessId:  r.business_id as string | null,
    title:       r.title as string,
    description: r.description as string,
    pageContext: r.page_context as string | null,
    status:      r.status as string,
    createdAt:   r.created_at as string,
    email:       emailMap[r.user_id as string] ?? "unknown",
    businessName: (Array.isArray(r.businesses) ? r.businesses[0] : r.businesses as { name: string } | null)?.name ?? null,
  }));

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-white">Feature Requests</h1>
          <p className="text-[13px] text-white/40 mt-0.5">Beta user suggestions</p>
        </div>
        <span className="text-[12px] text-white/30">
          {enriched.length} total · {enriched.filter((r) => r.status === "new").length} new
        </span>
      </div>

      <FeatureRequestsClient requests={enriched} />
    </div>
  );
}
