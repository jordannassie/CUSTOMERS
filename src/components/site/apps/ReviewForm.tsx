import { saveAppReviewAction } from "@/modules/apps-directory/review-actions";
import type { StoredReview } from "@/modules/apps-directory/review-types";
import { FormSelect } from "./FormSelect";

const field = "mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-[14px] text-foreground outline-none focus:border-brand";

export function ReviewForm({ slug, existing, error }: { slug: string; existing: StoredReview | null; error?: string }) {
  return (
    <form action={saveAppReviewAction} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      {error ? <p className="rounded-xl border border-rival-mark bg-rival-tint px-3 py-2 text-[13px] text-danger">{error}</p> : null}
      {existing ? <p className="text-[13px] text-muted-foreground">You already have a {existing.status} review. Saving sends the updated review back for moderation.</p> : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="review-rating" className="text-[13px] font-semibold text-foreground">Overall rating</label>
        <FormSelect
          id="review-rating"
          name="rating"
          defaultValue={String(existing?.rating ?? 5)}
          options={[5, 4, 3, 2, 1].map((score) => ({ value: String(score), label: `${score} out of 5` }))}
        />
      </div>
      <label className="text-[13px] font-semibold text-foreground">Review title
        <input name="title" required minLength={4} maxLength={120} defaultValue={existing?.title ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-foreground">What do you use it for?
        <textarea name="useCase" required minLength={8} maxLength={600} rows={3} defaultValue={existing?.useCase ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-foreground">Pros
        <textarea name="pros" required minLength={8} maxLength={800} rows={3} defaultValue={existing?.pros ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-foreground">Cons
        <textarea name="cons" required minLength={8} maxLength={800} rows={3} defaultValue={existing?.cons ?? ""} className={field} />
      </label>
      <fieldset>
        <legend className="text-[13px] font-semibold text-foreground">Do you recommend it?</legend>
        <label className="mr-4 text-[14px]"><input type="radio" name="recommendation" value="yes" defaultChecked={existing?.recommendation !== "no"} /> Yes</label>
        <label className="text-[14px]"><input type="radio" name="recommendation" value="no" defaultChecked={existing?.recommendation === "no"} /> No</label>
      </fieldset>
      <label className="text-[13px] font-semibold text-foreground">Company, optional
        <input name="company" maxLength={80} defaultValue={existing?.company ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-foreground">Industry, optional
        <input name="industry" maxLength={80} defaultValue={existing?.industry ?? ""} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-foreground">Role, optional
        <input name="role" maxLength={80} defaultValue={existing?.role ?? ""} className={field} />
      </label>
      <label className="flex items-start gap-2 text-[14px] text-foreground">
        <input type="checkbox" name="experienced" value="yes" required className="mt-1" />
        I have used this product.
      </label>
      <button type="submit" className="h-10 rounded-full bg-brand text-[14px] font-semibold text-white hover:bg-brand-strong">Submit review</button>
    </form>
  );
}
