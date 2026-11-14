import { MessageSquareText, SearchX } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/modules/auth";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides } from "@/modules/apps-directory/dal";
import { countReviewsByStatus, getReview, listEvents, listModerationQueue, listReviewsByStatus, peersFor } from "@/modules/apps-directory/reviews/dal";
import { spamSignals } from "@/modules/apps-directory/review-service";
import type { StoredReview } from "@/modules/apps-directory/review-types";
import AdminEmpty from "../_components/admin-empty";
import FilterTabs from "../_components/filter-tabs";
import AdminPageHeader from "../_components/page-header";
import { adminApps, appName } from "../apps/_components/admin-apps";
import { ReviewDetail } from "./_components/review-detail";
import { REVIEW_TABS, STATUS_LABELS, TAB_LABELS, reportLabel, reviewTab, type ReviewTab } from "./_components/review-tabs";

export const metadata = { title: "App reviews" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BASE = "/internal/admin/reviews";

const tabHref = (tab: ReviewTab) => (tab === "pending" ? BASE : `${BASE}?status=${tab}`);

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin({ next: BASE });
  const raw = await searchParams;
  const tab = reviewTab(raw.status);
  const selectedId = typeof raw.review === "string" ? raw.review : "";
  const [queue, decided, overrides, counts] = await Promise.all([
    listModerationQueue(),
    tab === "pending" ? Promise.resolve([] as StoredReview[]) : listReviewsByStatus(tab),
    listDirectoryOverrides(),
    countReviewsByStatus(),
  ]);
  const list = tab === "pending" ? queue.pending : decided;
  const selected = selectedId ? await getReview(selectedId) : null;
  const events = selected ? await listEvents(selected.id) : [];
  const signals = selected ? spamSignals(selected, await peersFor(selected.slug, selected.id)) : [];
  // The app's name ("Canva"), not its slug ("canva").
  const apps = adminApps(DIRECTORY_CATALOG, overrides.apps);
  const reviewHref = (id: string) => `${tabHref(tab)}${tab === "pending" ? "?" : "&"}review=${encodeURIComponent(id)}`;

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title="App reviews"
        subtitle="Reviews of apps on /apps. New ones stay pending until approved here. Treat high and low ratings the same way."
      />
      {typeof raw.error === "string" && (
        <p role="alert" className="rounded-md border border-border bg-low-bg px-4 py-3 text-[length:calc(14px*var(--px,1))] text-low-text">{raw.error}</p>
      )}
      {queue.unavailable && (
        <p className="rounded-md bg-primary-tint px-4 py-3 text-[length:calc(14px*var(--px,1))] text-foreground">
          The review tables are not in this database yet (migration 074).
        </p>
      )}

      <FilterTabs
        label="Filter by status"
        active={tab}
        // Every tab shows its total (QA round 2, item 9); pending turns orange while any wait for a decision.
        tabs={REVIEW_TABS.map((t) => ({ key: t, label: TAB_LABELS[t], href: tabHref(t), count: counts[t] ?? undefined, alert: t === "pending" }))}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold">{TAB_LABELS[tab]}</h2>
        {list.length === 0 ? (
          <AdminEmpty icon={MessageSquareText} title={tab === "pending" ? "No pending reviews" : `No ${tab === "all" ? "" : `${TAB_LABELS[tab].toLowerCase()} `}reviews`}>
            {tab === "pending" ? "New reviews show here until approved or rejected." : "Reviews show here once they have this status."}
          </AdminEmpty>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((review) => (
              <li key={review.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-card px-4 py-3 text-[length:calc(14px*var(--px,1))] break-words">
                <Link href={reviewHref(review.id)} className="font-medium text-primary hover:underline">{review.title}</Link>
                <span className="text-muted-foreground">{appName(apps, review.slug)}, {review.rating} of 5</span>
                {tab === "all" && <Badge variant="secondary">{STATUS_LABELS[review.status]}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {tab === "pending" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold">Open reports</h2>
          {queue.reports.length === 0 ? (
            <AdminEmpty>No open reports.</AdminEmpty>
          ) : (
            <ul className="flex flex-col gap-2">
              {queue.reports.map((report) => (
                <li key={report.id} className="rounded-md border border-border bg-card px-4 py-3 text-[length:calc(14px*var(--px,1))] break-words">
                  <Link href={reviewHref(report.reviewId)} className="font-medium text-primary hover:underline">{reportLabel(report.reason)}</Link>
                  {report.details && <span className="text-muted-foreground"> {report.details}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {selected && <ReviewDetail review={selected} appName={appName(apps, selected.slug)} signals={signals} events={events} />}
      {/* A link to a review that is gone said nothing at all; say so, like Leads (admin audit 2026-11-12). */}
      {selectedId && !selected && (
        <AdminEmpty icon={SearchX} title="Review not found">
          This link points to a review that is not here any more. Pick one from the list.
        </AdminEmpty>
      )}
    </div>
  );
}
