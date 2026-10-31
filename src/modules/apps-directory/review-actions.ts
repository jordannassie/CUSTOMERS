"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/modules/auth";
import { DIRECTORY_CATALOG } from "./catalog";
import { listDirectoryOverrides } from "./dal";
import { mergeCatalog } from "./service";
import { addReport, countSince, currentReviewer, findOwnReview, getReview, peersFor, saveOwnedReview, setReviewStatus, setVote } from "./reviews/dal";
import { blankToNull, moderationSchema, reportSchema, reviewDraftSchema, voteSchema } from "./review-schema";
import { canSubmitReview, eventForDecision, spamSignals, statusAfterDecision } from "./review-service";

async function activeSlug(slug: string): Promise<boolean> {
  const overrides = await listDirectoryOverrides();
  return mergeCatalog(DIRECTORY_CATALOG, overrides.apps).some((app) => app.active && app.slug === slug);
}

function refresh(slug: string) {
  revalidatePath("/");
  revalidatePath("/apps");
  revalidatePath(`/apps/${slug}`);
  revalidatePath("/internal/admin/reviews");
}

export async function saveAppReviewAction(formData: FormData): Promise<void> {
  const parsed = reviewDraftSchema.safeParse({
    slug: formData.get("slug"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    useCase: formData.get("useCase"),
    pros: formData.get("pros"),
    cons: formData.get("cons"),
    recommendation: formData.get("recommendation"),
    company: formData.get("company") ?? "",
    industry: formData.get("industry") ?? "",
    role: formData.get("role") ?? "",
    experienced: formData.get("experienced"),
  });
  const slug = parsed.success ? parsed.data.slug : String(formData.get("slug") ?? "");
  function fail(message: string): never {
    redirect(`/apps/${slug}/review?error=${encodeURIComponent(message)}`);
    throw new Error(message);
  }
  const user = await requireUser({ next: `/apps/${slug}/review` });
  const reviewer = await currentReviewer();
  const allowed = canSubmitReview({ signedIn: true, emailConfirmed: Boolean(reviewer?.emailConfirmed) });
  if (!allowed.ok) fail("Confirm your email before writing a review.");
  const data = parsed.success ? parsed.data : null;
  if (!data) fail("Check the rating, title, and that each text box has a few words.");
  if (!(await activeSlug(data.slug))) fail("That app is not in the directory.");
  const existing = await findOwnReview(user.id, data.slug);
  if (!existing) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if ((await countSince(user.id, since)) >= 3) fail("You can submit 3 new reviews a day.");
  }
  const draft = {
    slug: data.slug,
    rating: data.rating,
    title: data.title,
    useCase: data.useCase,
    pros: data.pros,
    cons: data.cons,
    recommendation: data.recommendation,
    company: blankToNull(data.company),
    industry: blankToNull(data.industry),
    role: blankToNull(data.role),
  };
  const saved = await saveOwnedReview({ reviewer: { userId: user.id, emailConfirmed: true }, draft, existing });
  if (!saved.ok) fail(saved.unavailable ? "Reviews are not available yet (migration 074)." : "Could not save that review.");
  refresh(draft.slug);
  redirect(`/apps/${draft.slug}/review?saved=pending`);
}

export async function reportAppReviewAction(formData: FormData): Promise<void> {
  const parsed = reportSchema.safeParse({ reviewId: formData.get("reviewId"), reason: formData.get("reason"), details: formData.get("details") ?? "" });
  const slug = String(formData.get("slug") ?? "");
  const user = await requireUser({ next: slug ? `/apps/${slug}` : "/apps" });
  if (!parsed.success) redirect(slug ? `/apps/${slug}` : "/apps");
  const review = await getReview(parsed.data.reviewId);
  if (!review || review.status !== "published" || review.userId === user.id) redirect(`/apps/${slug || review?.slug || ""}`);
  await addReport({ reviewId: review.id, reporterId: user.id, reason: parsed.data.reason, details: blankToNull(parsed.data.details) });
  refresh(review.slug);
  redirect(`/apps/${review.slug}?reported=1`);
}

export async function voteAppReviewAction(formData: FormData): Promise<void> {
  const parsed = voteSchema.safeParse({ reviewId: formData.get("reviewId"), helpful: formData.get("helpful") });
  const slug = String(formData.get("slug") ?? "");
  const user = await requireUser({ next: slug ? `/apps/${slug}` : "/apps" });
  if (!parsed.success) redirect(slug ? `/apps/${slug}` : "/apps");
  const review = await getReview(parsed.data.reviewId);
  if (!review || review.status !== "published" || review.userId === user.id) redirect(`/apps/${slug || review?.slug || ""}`);
  await setVote({ reviewId: review.id, userId: user.id, helpful: parsed.data.helpful === "yes" });
  refresh(review.slug);
  redirect(`/apps/${review.slug}#reviews`);
}

export async function moderateAppReviewAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = moderationSchema.safeParse({
    reviewId: formData.get("reviewId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) redirect("/internal/admin/reviews?error=Choose%20a%20review%20and%20a%20decision.");
  const review = await getReview(parsed.data.reviewId);
  if (!review) redirect("/internal/admin/reviews?error=That%20review%20is%20not%20available.");
  const peers = await peersFor(review.slug, review.id);
  const signals = spamSignals(review, peers);
  const note = [blankToNull(parsed.data.note), signals.length ? `Signals: ${signals.join(", ")}` : null].filter(Boolean).join(" ");
  const saved = await setReviewStatus({
    review,
    status: statusAfterDecision(parsed.data.decision),
    actorId: admin.id,
    action: eventForDecision(parsed.data.decision),
    note: note || null,
  });
  if (!saved.ok) redirect(`/internal/admin/reviews?review=${review.id}&error=${encodeURIComponent(saved.unavailable ? "Apply migration 074 before moderating reviews." : "Could not update that review.")}`);
  refresh(review.slug);
  redirect("/internal/admin/reviews");
}
