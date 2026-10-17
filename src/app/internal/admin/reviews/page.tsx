import { requireAdmin } from "@/lib/admin/require";
import { moderateAppReviewAction } from "@/modules/apps-directory/review-actions";
import { getReview, listEvents, listModerationQueue, peersFor } from "@/modules/apps-directory/review-dal";
import { spamSignals } from "@/modules/apps-directory/review-service";

export const metadata = { title: "App reviews | Admin", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const raw = await searchParams;
  const selectedId = typeof raw.review === "string" ? raw.review : "";
  const queue = await listModerationQueue();
  const selected = selectedId ? await getReview(selectedId) : null;
  const events = selected ? await listEvents(selected.id) : [];
  const signals = selected ? spamSignals(selected, await peersFor(selected.slug, selected.id)) : [];

  return (
    <div className="max-w-4xl p-6 sm:p-8">
      <h1 className="text-[24px] font-bold text-[#111827]">App reviews</h1>
      <p className="mt-2 text-[14px] text-[#6B7280]">New reviews stay pending. Approve and reject the same way for high and low ratings.</p>
      {typeof raw.error === "string" ? <p className="mt-4 text-[14px] text-[#991B1B]">{raw.error}</p> : null}
      {queue.unavailable ? (
        <p className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[14px] text-[#92400E]">Apply migration 027 before moderating reviews.</p>
      ) : null}

      <h2 className="mt-8 text-[18px] font-semibold text-[#111827]">Pending</h2>
      {queue.pending.length === 0 ? <p className="mt-2 text-[14px] text-[#6B7280]">No pending reviews.</p> : (
        <ul className="mt-3 flex flex-col gap-2">
          {queue.pending.map((review) => (
            <li key={review.id} className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[14px]">
              <a href={`/internal/admin/reviews?review=${review.id}`} className="font-semibold text-[#0866F5]">{review.title}</a>
              <span className="text-[#6B7280]"> · {review.slug} · {review.rating}/5</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-[18px] font-semibold text-[#111827]">Open reports</h2>
      {queue.reports.length === 0 ? <p className="mt-2 text-[14px] text-[#6B7280]">No open reports.</p> : (
        <ul className="mt-3 flex flex-col gap-2">
          {queue.reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[14px]">
              <a href={`/internal/admin/reviews?review=${report.reviewId}`} className="font-semibold text-[#0866F5]">{report.reason}</a>
              {report.details ? <span className="text-[#6B7280]"> · {report.details}</span> : null}
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <section className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-[18px] font-semibold text-[#111827]">{selected.title}</h2>
          <p className="mt-1 text-[13px] text-[#6B7280]">{selected.slug} · {selected.status} · {selected.rating}/5 · {selected.recommendation === "yes" ? "recommends" : "does not recommend"}</p>
          {signals.length > 0 ? <p className="mt-2 text-[13px] text-[#92400E]">Signals: {signals.join(", ")}. These do not approve or reject the review.</p> : null}
          <p className="mt-3 text-[14px] text-[#111827]">{selected.useCase}</p>
          <p className="mt-2 text-[14px]"><span className="font-semibold">Pros. </span>{selected.pros}</p>
          <p className="mt-1 text-[14px]"><span className="font-semibold">Cons. </span>{selected.cons}</p>
          <form action={moderateAppReviewAction} className="mt-4 flex flex-col gap-2">
            <input type="hidden" name="reviewId" value={selected.id} />
            <label className="text-[13px] font-semibold">Note
              <input name="note" maxLength={500} className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px]" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button name="decision" value="approve" className="h-9 rounded-lg bg-[#0866F5] px-3 text-[13px] font-semibold text-white">Approve</button>
              <button name="decision" value="reject" className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-[13px] font-semibold">Reject</button>
              <button name="decision" value="remove" className="h-9 rounded-lg border border-[#FECACA] px-3 text-[13px] font-semibold text-[#991B1B]">Remove</button>
            </div>
          </form>
          <h3 className="mt-6 text-[15px] font-semibold">Edit history</h3>
          {events.length === 0 ? <p className="mt-1 text-[13px] text-[#6B7280]">No events stored.</p> : (
            <ol className="mt-2 flex flex-col gap-2">
              {events.map((event, index) => (
                <li key={`${event.createdAt}-${index}`} className="text-[13px] text-[#374151]">
                  <span className="font-semibold">{event.action}</span>
                  <span className="text-[#6B7280]"> · {event.createdAt}</span>
                  {event.note ? <span> · {event.note}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}
