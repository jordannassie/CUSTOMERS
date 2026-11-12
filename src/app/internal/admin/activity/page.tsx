import { Suspense } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/modules/auth";
import { activityQuery, ACTIVITY_AREAS, AREA_LABELS, listAdminActivity, type ActivityList, type ActivityQuery } from "@/modules/admin";
import AdminEmpty from "../_components/admin-empty";
import FilterTabs from "../_components/filter-tabs";
import { formatDate } from "../_components/format";
import AdminPageHeader from "../_components/page-header";
import Pagination from "../_components/pagination";
import { ListSkeleton } from "../_components/skeletons";

export const metadata = { title: "Admin activity" };

const BASE = "/internal/admin/activity";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Every admin action, newest first: who did it, what, to which account and why (admin review 2026-11-12). Until now
// the history was only visible on each agency's page.
export default function AdminActivityPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title="Admin activity"
        subtitle="Every change an admin made, newest first, with the reason they gave. Changes that did not go through are marked."
      />
      <Suspense fallback={<ListSkeleton label="Loading admin activity" />}>
        <Activity searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function href(query: ActivityQuery, change: Partial<ActivityQuery>): string {
  const next = { ...query, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.area) params.set("area", next.area);
  if (next.failed) params.set("failed", "1");
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

async function Activity({ searchParams }: Props) {
  await requireAdmin({ next: BASE });
  const raw = await searchParams;
  const query = activityQuery.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const list = await listAdminActivity(query);
  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        label="Filter by area"
        active={query.area ?? "all"}
        tabs={[
          { key: "all", label: "All", href: href(query, { area: undefined }) },
          ...ACTIVITY_AREAS.map((a) => ({ key: a, label: AREA_LABELS[a], href: href(query, { area: a }) })),
        ]}
      />
      <Link href={href(query, { failed: query.failed ? undefined : "1" })} className="w-fit text-[length:calc(13px*var(--px,1))] font-medium text-primary hover:underline">
        {query.failed ? "Show every change" : "Show only changes that did not go through"}
      </Link>
      <Rows list={list} query={query} />
    </div>
  );
}

const OUTCOME = { failed: "Did not go through", started: "Result not confirmed" } as const;

function Rows({ list, query }: { list: ActivityList; query: ActivityQuery }) {
  if (list.rows.length === 0) {
    return (
      <AdminEmpty icon={History} title={query.area || query.failed ? "No changes match these filters" : "No admin changes yet"}>
        {query.area || query.failed ? "Pick All to see every change." : "Credit changes, suspensions, retries and resolved alerts show here."}
      </AdminEmpty>
    );
  }
  const params = Object.fromEntries(new URL(href(query, {}), "http://x").searchParams);
  return (
    <>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))]">
        {list.rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{r.label}</span>
                {r.target.name &&
                  (r.target.href ? (
                    <Link href={r.target.href} className="text-primary hover:underline">
                      {r.target.name}
                    </Link>
                  ) : (
                    <span>{r.target.name}</span>
                  ))}
                {r.outcome !== "done" && <Badge variant="mid">{OUTCOME[r.outcome]}</Badge>}
              </p>
              {r.reason && <p className="break-words text-muted-foreground">Reason: {r.reason}</p>}
              <p className="text-text-hint">By {r.by}</p>
            </div>
            <span className="shrink-0 text-text-hint tabular-nums">{formatDate(r.at, true)}</span>
          </li>
        ))}
      </ul>
      <Pagination base={BASE} params={params} page={list.page} pages={list.pages} total={list.total} pageSize={50} noun="changes" />
    </>
  );
}
