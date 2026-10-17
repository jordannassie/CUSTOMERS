import { reportAppReviewAction, voteAppReviewAction } from "@/modules/apps-directory/review-actions";
import type { PublicReview } from "@/modules/apps-directory/review-types";

export function ReviewList({ slug, reviews, signedIn }: { slug: string; reviews: PublicReview[]; signedIn: boolean }) {
  if (reviews.length === 0) {
    return <p className="text-[14px] text-[#777773]">No Customers.Direct reviews yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-2xl border border-[#E5E5E1] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-semibold text-[#171717]">{review.title}</h3>
            <p className="text-[13px] font-semibold text-[#171717]">{review.rating.toFixed(1)}/5</p>
          </div>
          <p className="mt-1 text-[12px] text-[#777773]">
            {review.label}
            {review.industry ? ` · ${review.industry}` : ""}
            {review.recommendation === "yes" ? " · Recommends it" : " · Does not recommend it"}
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[#171717]">{review.useCase}</p>
          <p className="mt-2 text-[14px] text-[#171717]"><span className="font-semibold">Pros. </span>{review.pros}</p>
          <p className="mt-1 text-[14px] text-[#171717]"><span className="font-semibold">Cons. </span>{review.cons}</p>
          <p className="mt-2 text-[12px] text-[#A3A3A0]">{review.helpfulCount} found this helpful</p>
          {review.mine ? <p className="mt-2 text-[12px] font-semibold text-[#0866F5]">Your published review</p> : null}
          {!review.mine && signedIn ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <form action={voteAppReviewAction}>
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="helpful" value="yes" />
                <button type="submit" className="text-[12px] font-semibold text-[#0866F5]">Helpful</button>
              </form>
              <form action={reportAppReviewAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="slug" value={slug} />
                <label className="sr-only" htmlFor={`reason-${review.id}`}>Report reason</label>
                <select id={`reason-${review.id}`} name="reason" className="h-8 rounded-lg border border-[#E5E5E1] bg-white px-2 text-[12px]" defaultValue="spam">
                  <option value="spam">Spam</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="not_a_customer">Not a customer</option>
                  <option value="offensive">Offensive</option>
                  <option value="other">Other</option>
                </select>
                <button type="submit" className="text-[12px] font-semibold text-[#777773]">Report</button>
              </form>
            </div>
          ) : null}
          {!review.mine && !signedIn ? (
            <a href={`/login?next=/apps/${slug}`} className="mt-2 inline-flex text-[12px] font-semibold text-[#0866F5]">Sign in to vote or report</a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
