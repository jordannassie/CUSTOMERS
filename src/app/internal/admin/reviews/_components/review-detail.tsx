import { Badge } from "@/components/ui/badge";
import type { StoredReview } from "@/modules/apps-directory/review-types";
import { formatDate } from "../../_components/format";
import { ReviewDecision } from "./review-decision";
import { STATUS_LABELS } from "./review-tabs";

/** One review opened from a list: what it says, the decision buttons and its history. */
export function ReviewDetail({
  review,
  appName,
  signals,
  events,
}: {
  review: StoredReview;
  appName: string;
  signals: string[];
  events: { action: string; note: string | null; createdAt: string }[];
}) {
  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 text-[length:calc(14px*var(--px,1))] sm:p-6">
      <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold break-words">{review.title}</h2>
      <div className="flex flex-wrap items-center gap-2 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
        <span className="font-medium text-foreground">{appName}</span>
        <Badge variant="secondary">{STATUS_LABELS[review.status]}</Badge>
        <span>{review.rating} of 5</span>
        <span>{review.recommendation === "yes" ? "Recommends" : "Does not recommend"}</span>
      </div>
      {signals.length > 0 && (
        <p className="text-[length:calc(13px*var(--px,1))] text-mid-text">Signals: {signals.join(", ")}. These do not approve or reject the review.</p>
      )}
      <p className="mt-2 break-words">{review.useCase}</p>
      <p className="break-words"><span className="font-medium">Pros: </span>{review.pros}</p>
      <p className="break-words"><span className="font-medium">Cons: </span>{review.cons}</p>
      <ReviewDecision reviewId={review.id} title={review.title} />
      <h3 className="mt-6 text-[length:calc(15px*var(--px,1))] font-semibold">Edit history</h3>
      {events.length === 0 ? (
        <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">No history yet.</p>
      ) : (
        <ol className="flex flex-col gap-2 text-[length:calc(13px*var(--px,1))]">
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
  );
}
