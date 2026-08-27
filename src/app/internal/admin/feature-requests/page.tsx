import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";
import FeatureRequestsClient from "./FeatureRequestsClient";

export const metadata = { title: "Feature Requests | Admin", robots: { index: false } };
// Never cache — always fetch fresh
export const dynamic = "force-dynamic";

export default async function AdminFeatureRequestsPage() {
  await requireAdmin();

  const svc = createServiceClient();

  // Try fetching — if the table doesn't exist this returns an error
  const { data: requests, error: fetchError } = await svc
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

  // Table doesn't exist — show migration instructions
  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-[20px] font-bold text-[#111827] mb-2">Feature Requests</h1>
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-6">
          <p className="text-[13px] font-semibold text-[#92400E] mb-2">Table not yet created on production</p>
          <p className="text-[12px] text-[#B45309] mb-4">
            Run the SQL below in your{" "}
            <a href="https://app.supabase.com" target="_blank" rel="noreferrer" className="underline">
              Supabase SQL Editor
            </a>{" "}
            to create the <code className="bg-amber-100 px-1 rounded">feature_requests</code> table:
          </p>
          <pre className="bg-[#1E293B] text-green-300 text-[11px] rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
{`create table if not exists public.feature_requests (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  business_id uuid        references public.businesses(id) on delete set null,
  title       text        not null check (char_length(trim(title)) >= 1 and char_length(title) <= 200),
  description text        not null check (char_length(trim(description)) >= 1 and char_length(description) <= 2000),
  page_context text,
  status      text        not null default 'new'
                          check (status in ('new','reviewing','planned','shipped','declined')),
  created_at  timestamptz not null default now()
);
create index if not exists feature_requests_user_id_idx    on public.feature_requests (user_id);
create index if not exists feature_requests_status_idx     on public.feature_requests (status);
create index if not exists feature_requests_created_at_idx on public.feature_requests (created_at desc);
alter table public.feature_requests enable row level security;
create policy "feature_requests_insert" on public.feature_requests
  for insert to authenticated with check (user_id = auth.uid());
create policy "feature_requests_select_own" on public.feature_requests
  for select to authenticated using (user_id = auth.uid());`}
          </pre>
          <p className="text-[11px] text-[#B45309] mt-3">After running, refresh this page.</p>
        </div>
        <p className="text-[11px] text-[#9CA3AF] mt-3">Error: {fetchError.message}</p>
      </div>
    );
  }

  // Get user emails
  const userIds = [...new Set((requests ?? []).map((r) => r.user_id))];
  const emailMap: Record<string, string> = {};
  for (const uid of userIds) {
    try {
      const { data } = await svc.auth.admin.getUserById(uid);
      if (data.user?.email) emailMap[uid] = data.user.email;
    } catch { /* skip */ }
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
    businessName: (Array.isArray(r.businesses)
      ? r.businesses[0]
      : r.businesses as { name: string } | null)?.name ?? null,
  }));

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#111827]">Feature Requests</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Beta user suggestions</p>
        </div>
        <span className="text-[12px] text-[#9CA3AF]">
          {enriched.length} total · {enriched.filter((r) => r.status === "new").length} new
        </span>
      </div>

      <FeatureRequestsClient requests={enriched} />
    </div>
  );
}
