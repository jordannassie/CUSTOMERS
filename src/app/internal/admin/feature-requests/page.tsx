import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import FeatureRequestsClient from "./FeatureRequestsClient";

export const metadata = { title: "Feature requests" };

export default async function AdminFeatureRequestsPage() {
  await requireAdmin({ next: "/internal/admin/feature-requests" });

  const svc = createServiceClient();

  // A fetch error means the table is missing
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

  // Show migration instructions
  if (fetchError) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Feature requests</h1>
        </header>
        <div className="rounded-md border border-border bg-mid-bg p-4 text-mid-text sm:p-6">
          <p className="mb-2 text-[14px] font-semibold">Table not yet created on production</p>
          <p className="mb-4 text-[13px]">
            Run the SQL below in your{" "}
            <a href="https://app.supabase.com" target="_blank" rel="noreferrer" className="underline">
              Supabase SQL Editor
            </a>{" "}
            to create the <code className="rounded-sm bg-surface px-1">feature_requests</code> table:
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-surface p-4 text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
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
          <p className="mt-3 text-[13px]">After running, refresh this page.</p>
        </div>
        <p className="text-[13px] text-text-hint">Error: {fetchError.message}</p>
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

  const newCount = enriched.filter((r) => r.status === "new").length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Feature requests</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Beta user suggestions</p>
        </div>
        <p className="text-[13px] text-muted-foreground">
          {enriched.length} total, {newCount} new
        </p>
      </header>

      <FeatureRequestsClient requests={enriched} />
    </div>
  );
}
