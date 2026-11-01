import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/modules/auth";
import { moderateAppReviewAction } from "@/modules/apps-directory/review-actions";
import { getReview, listEvents, listModerationQueue, peersFor } from "@/modules/apps-directory/reviews/dal";
import { spamSignals } from "@/modules/apps-directory/review-service";
import AdminEmpty from "../_components/admin-empty";
import { formatDate } from "../_components/format";
import AdminPageHeader from "../_components/page-header";

export const metadata = { title: "App reviews" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BASE = "/internal/admin/reviews";

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin({ next: BASE });
  const raw = await searchParams;
  const selectedId = typeof raw.review === "string" ? raw.review : "";
  const queue = await listModerationQueue();
  const selected = selectedId ? await getReview(selectedId) : null;
  const events = selected ? await listEvents(selected.id) : [];
  const signals = selected ? spamSignals(selected, await peersFor(selected.slug, selected.id)) : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="App reviews"
        subtitle="Reviews of apps on /apps. New ones stay pending until approved here. Treat high and low ratings the same way."
      />
      {typeof raw.error === "string" && (
        <p role="alert" className="rounded-md border border-border bg-low-bg px-4 py-3 text-[14px] text-low-text">{raw.error}</p>
      )}
      {queue.unavailable && (
        <p className="rounded-md border border-border bg-mid-bg px-4 py-3 text-[14px] text-mid-text">
          The review tables are not in this database yet (migration 074).
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold">Pending</h2>
        {queue.pending.length === 0 ? (
          <AdminEmpty icon={MessageSquareText} title="No pending reviews">New reviews show here until approved or rejected.</AdminEmpty>
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.pending.map((review) => (
              <li key={review.id} className="rounded-md border border-border bg-card px-4 py-3 text-[14px] break-words">
                <Link href={`${BASE}?review=${review.id}`} className="font-medium text-primary hover:underline">{review.title}</Link>
                <span className="text-muted-foreground"> {review.slug}, {review.rating} of 5</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold">Open reports</h2>
        {queue.reports.length === 0 ? (
          <AdminEmpty>No open reports.</AdminEmpty>
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.reports.map((report) => (
              <li key={report.id} className="rounded-md border border-border bg-card px-4 py-3 text-[14px] break-words">
                <Link href={`${BASE}?review=${report.reviewId}`} className="font-medium text-primary hover:underline">{report.reason}</Link>
                {report.details && <span className="text-muted-foreground"> {report.details}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <section className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 text-[14px] sm:p-6">
          <h2 className="text-[16px] font-semibold break-words">{selected.title}</h2>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span>{selected.slug}</span>
            <Badge variant="outline" className="capitalize">{selected.status}</Badge>
            <span>{selected.rating} of 5</span>
            <span>{selected.recommendation === "yes" ? "Recommends" : "Does not recommend"}</span>
          </div>
          {signals.length > 0 && (
            <p className="text-[13px] text-mid-text">Signals: {signals.join(", ")}. These do not approve or reject the review.</p>
          )}
          <p className="mt-2 break-words">{selected.useCase}</p>
          <p className="break-words"><span className="font-medium">Pros: </span>{selected.pros}</p>
          <p className="break-words"><span className="font-medium">Cons: </span>{selected.cons}</p>
          <form action={moderateAppReviewAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="reviewId" value={selected.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="review-note">Note</Label>
              <Input id="review-note" name="note" maxLength={500} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button name="decision" value="approve">Approve</Button>
              <Button name="decision" value="reject" variant="outline">Reject</Button>
              <Button name="decision" value="remove" variant="destructive">Remove</Button>
            </div>
          </form>
          <h3 className="mt-6 text-[15px] font-semibold">Edit history</h3>
          {events.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No history yet.</p>
          ) : (
            <ol className="flex flex-col gap-2 text-[13px]">
              {events.map((event, index) => (
                <li key={`${event.createdAt}-${index}`} className="break-words">
                  <span className="font-medium capitalize">{event.action}</span>
                  <span className="text-muted-foreground"> {formatDate(event.createdAt, true)}</span>
                  {event.note && <span> {event.note}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
