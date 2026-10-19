import { requireAdmin } from "@/modules/auth";
import { listFeatureRequests } from "@/modules/feedback";
import AdminPageHeader from "../_components/page-header";
import FeatureRequestsClient from "./FeatureRequestsClient";
import { featureFilter } from "./_components/request-parts";

export const metadata = { title: "Feature requests" };

// listFeatureRequests (modules/feedback) returns the newest 200; a full list means older ones were left out.
const LIST_CAP = 200;

type Props = { searchParams: Promise<{ status?: string | string[] }> };

export default async function AdminFeatureRequestsPage({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/feature-requests" });

  const result = await listFeatureRequests();
  const fetchError = "error" in result ? { message: result.error } : null;

  // Show migration instructions
  if (fetchError) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <AdminPageHeader title="Feature requests" subtitle="Ideas people sent with Suggest a feature in the app." />
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

  const requests = "requests" in result ? result.requests : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <FeatureRequestsClient
        requests={requests}
        filter={featureFilter((await searchParams).status)}
        capped={requests.length >= LIST_CAP ? LIST_CAP : null}
      />
    </div>
  );
}
