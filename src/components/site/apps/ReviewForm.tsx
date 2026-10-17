import { saveAppReviewAction } from "@/modules/apps-directory/review-actions";
import type { StoredReview } from "@/modules/apps-directory/review-types";

const field = "mt-1 w-full rounded-xl border border-[#E5E5E1] bg-white px-3 py-2 text-[14px] text-[#171717] outline-none focus:border-[#0866F5]";

export function ReviewForm({ slug, existing, error }: { slug: string; existing: StoredReview | null; error?: string }) {
  return (
    <form action={saveAppReviewAction} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      {error ? <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]">{error}</p> : null}
      {existing ? <p className="text-[13px] text-[#777773]">You already have a {existing.status} review. Saving sends the updated review back for moderation.</p> : null}
      <label className="text-[13px] font-semibold text-[#171717]">Overall rating
        <select name="rating" defaultValue={existing?.rating ?? 5} className={field} required>
          {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} out of 5</option>)}
        </select>
      </label>
      <label className="text-[13px] font-semibold text-[#171717]">Review title
        <input name="title" required minLength={4} maxLength={120} defaultValue={existing?.title ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-[#171717]">What do you use it for?
        <textarea name="useCase" required minLength={8} maxLength={600} rows={3} defaultValue={existing?.useCase ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-[#171717]">Pros
        <textarea name="pros" required minLength={8} maxLength={800} rows={3} defaultValue={existing?.pros ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-[#171717]">Cons
        <textarea name="cons" required minLength={8} maxLength={800} rows={3} defaultValue={existing?.cons ?? ""} className={field} />
      </label>
      <fieldset>
        <legend className="text-[13px] font-semibold text-[#171717]">Do you recommend it?</legend>
        <label className="mr-4 text-[14px]"><input type="radio" name="recommendation" value="yes" defaultChecked={existing?.recommendation !== "no"} /> Yes</label>
        <label className="text-[14px]"><input type="radio" name="recommendation" value="no" defaultChecked={existing?.recommendation === "no"} /> No</label>
      </fieldset>
      <label className="text-[13px] font-semibold text-[#171717]">Company, optional
        <input name="company" maxLength={80} defaultValue={existing?.company ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-[#171717]">Industry, optional
        <input name="industry" maxLength={80} defaultValue={existing?.industry ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-[#171717]">Role, optional
        <input name="role" maxLength={80} defaultValue={existing?.role ?? ""} className={field} />
      </label>
      <label className="flex items-start gap-2 text-[14px] text-[#171717]">
        <input type="checkbox" name="experienced" value="yes" required className="mt-1" />
        I have used this product.
      </label>
      <button type="submit" className="h-10 rounded-xl bg-[#0866F5] text-[14px] font-semibold text-white hover:bg-[#0757D4]">Submit review</button>
    </form>
  );
}
