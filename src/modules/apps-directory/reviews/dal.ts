import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { aggregateRatings, snapshotOf, summariesBySlug, toPublicReview } from "../review-service";
import type { Json } from "@/types/database.types";
import type { ModerationAction, NativeSummary, PublicReview, ReviewDraft, ReviewStatus, Reviewer, StoredReview } from "../review-types";
import { isMissingTable } from "@/lib/supabase/missing-table";

type ReviewRow = {
  id: string;
  slug: string;
  user_id: string;
  status: string;
  rating: number;
  title: string;
  use_case: string;
  pros: string;
  cons: string;
  recommendation: string;
  company: string | null;
  industry: string | null;
  job_role: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

const missingTable = (error: { code?: string; message?: string } | null) => isMissingTable(error, /app_reviews|app_review_/i);

function mapReview(row: ReviewRow): StoredReview | null {
  if (row.recommendation !== "yes" && row.recommendation !== "no") return null;
  if (!["pending", "published", "rejected", "removed"].includes(row.status)) return null;
  return {
    id: row.id,
    slug: row.slug,
    userId: row.user_id,
    status: row.status as ReviewStatus,
    rating: row.rating,
    title: row.title,
    useCase: row.use_case,
    pros: row.pros,
    cons: row.cons,
    recommendation: row.recommendation,
    company: row.company,
    industry: row.industry,
    role: row.job_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export async function currentReviewer(): Promise<Reviewer | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, emailConfirmed: Boolean(user.email_confirmed_at) };
}

export async function listNativeSummaries(): Promise<Record<string, NativeSummary>> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.from("app_reviews").select("slug, status, rating").eq("status", "published");
    if (error || !data) return {};
    return summariesBySlug(data.map((row) => ({ slug: row.slug, status: "published" as const, rating: row.rating })));
  } catch {
    return {};
  }
}

export async function listPublishedReviews(slug: string, viewerId: string | null): Promise<{ reviews: PublicReview[]; summary: NativeSummary; unavailable: boolean }> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.from("app_reviews").select("id, slug, user_id, status, rating, title, use_case, pros, cons, recommendation, company, industry, job_role, created_at, updated_at, published_at").eq("slug", slug).eq("status", "published").order("published_at", { ascending: false }).limit(50);
    if (error || !data) return { reviews: [], summary: { average: null, count: 0 }, unavailable: Boolean(error && missingTable(error)) };
    const reviews = data.map((row) => mapReview(row as ReviewRow)).filter((review): review is StoredReview => Boolean(review));
    const ids = reviews.map((review) => review.id);
    const helpful = new Map<string, number>();
    if (ids.length > 0) {
      const votes = await svc.from("app_review_votes").select("review_id, helpful").in("review_id", ids).eq("helpful", true);
      for (const vote of votes.data ?? []) helpful.set(vote.review_id, (helpful.get(vote.review_id) ?? 0) + 1);
    }
    return {
      reviews: reviews.map((review) => toPublicReview(review, helpful.get(review.id) ?? 0, viewerId)),
      summary: aggregateRatings(reviews),
      unavailable: false,
    };
  } catch {
    return { reviews: [], summary: { average: null, count: 0 }, unavailable: true };
  }
}

export async function findOwnReview(userId: string, slug: string): Promise<StoredReview | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.from("app_reviews").select("id, slug, user_id, status, rating, title, use_case, pros, cons, recommendation, company, industry, job_role, created_at, updated_at, published_at").eq("user_id", userId).eq("slug", slug).neq("status", "removed").maybeSingle();
  if (error || !data) return null;
  return mapReview(data as ReviewRow);
}

export async function countSince(userId: string, sinceIso: string): Promise<number> {
  const svc = createServiceClient();
  const { count } = await svc.from("app_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", sinceIso);
  return count ?? 0;
}

export async function saveOwnedReview(input: { reviewer: Reviewer; draft: ReviewDraft; existing: StoredReview | null }): Promise<{ ok: true; id: string } | { ok: false; unavailable: boolean }> {
  const svc = createServiceClient();
  const now = new Date().toISOString();
  const row = {
    slug: input.draft.slug,
    user_id: input.reviewer.userId,
    status: "pending",
    rating: input.draft.rating,
    title: input.draft.title,
    use_case: input.draft.useCase,
    pros: input.draft.pros,
    cons: input.draft.cons,
    recommendation: input.draft.recommendation,
    company: input.draft.company,
    industry: input.draft.industry,
    job_role: input.draft.role,
    experienced: true,
    updated_at: now,
    published_at: null,
  };
  const saved = input.existing
    ? await svc.from("app_reviews").update(row).eq("id", input.existing.id).eq("user_id", input.reviewer.userId).select("id").single()
    : await svc.from("app_reviews").insert(row).select("id").single();
  if (saved.error || !saved.data) {
    console.error("[reviews] save:", saved.error?.code, saved.error?.message);
    return { ok: false, unavailable: missingTable(saved.error) };
  }
  await recordEvent({ reviewId: saved.data.id, actorId: input.reviewer.userId, action: input.existing ? "edited" : "submitted", note: null, snapshot: { ...input.draft, status: input.existing?.status ?? "new" } });
  return { ok: true, id: saved.data.id };
}

export async function recordEvent(input: { reviewId: string; actorId: string | null; action: ModerationAction; note: string | null; snapshot: Record<string, unknown> }): Promise<void> {
  const svc = createServiceClient();
  const { error } = await svc.from("app_review_moderation_events").insert({
    review_id: input.reviewId,
    actor_id: input.actorId,
    action: input.action,
    note: input.note,
    snapshot: input.snapshot as Json,
  });
  if (error && !missingTable(error)) console.error("[reviews] event:", error.code, error.message);
}

export async function setReviewStatus(input: { review: StoredReview; status: ReviewStatus; actorId: string; action: ModerationAction; note: string | null }): Promise<{ ok: true } | { ok: false; unavailable: boolean }> {
  const svc = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await svc.from("app_reviews").update({
    status: input.status,
    updated_at: now,
    published_at: input.status === "published" ? now : null,
  }).eq("id", input.review.id);
  if (error) return { ok: false, unavailable: missingTable(error) };
  await recordEvent({ reviewId: input.review.id, actorId: input.actorId, action: input.action, note: input.note, snapshot: snapshotOf(input.review) });
  await svc.from("app_review_reports").update({ status: "closed" }).eq("review_id", input.review.id).eq("status", "open");
  return { ok: true };
}

export async function addReport(input: { reviewId: string; reporterId: string; reason: string; details: string | null }): Promise<{ ok: true } | { ok: false; unavailable: boolean }> {
  const svc = createServiceClient();
  const { error } = await svc.from("app_review_reports").insert({
    review_id: input.reviewId,
    reporter_id: input.reporterId,
    reason: input.reason,
    details: input.details,
    status: "open",
  });
  if (error) return { ok: false, unavailable: missingTable(error) };
  await recordEvent({ reviewId: input.reviewId, actorId: input.reporterId, action: "reported", note: input.reason, snapshot: {} });
  return { ok: true };
}

export async function setVote(input: { reviewId: string; userId: string; helpful: boolean }): Promise<{ ok: true } | { ok: false }> {
  const svc = createServiceClient();
  const { error } = await svc.from("app_review_votes").upsert({
    review_id: input.reviewId,
    user_id: input.userId,
    helpful: input.helpful,
  });
  return error ? { ok: false } : { ok: true };
}

export async function listModerationQueue(): Promise<{ pending: StoredReview[]; reports: { id: string; reviewId: string; reason: string; details: string | null }[]; unavailable: boolean }> {
  try {
    const svc = createServiceClient();
    const pending = await svc.from("app_reviews").select("id, slug, user_id, status, rating, title, use_case, pros, cons, recommendation, company, industry, job_role, created_at, updated_at, published_at").eq("status", "pending").order("created_at", { ascending: true }).limit(50);
    if (pending.error) return { pending: [], reports: [], unavailable: missingTable(pending.error) };
    const reports = await svc.from("app_review_reports").select("id, review_id, reason, details").eq("status", "open").order("created_at", { ascending: true }).limit(50);
    return {
      pending: (pending.data ?? []).map((row) => mapReview(row as ReviewRow)).filter((review): review is StoredReview => Boolean(review)),
      reports: (reports.data ?? []).map((row) => ({ id: row.id, reviewId: row.review_id, reason: row.reason, details: row.details })),
      unavailable: false,
    };
  } catch {
    return { pending: [], reports: [], unavailable: true };
  }
}

export async function getReview(id: string): Promise<StoredReview | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.from("app_reviews").select("id, slug, user_id, status, rating, title, use_case, pros, cons, recommendation, company, industry, job_role, created_at, updated_at, published_at").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapReview(data as ReviewRow);
}

export async function listEvents(reviewId: string): Promise<{ action: string; note: string | null; createdAt: string; snapshot: unknown }[]> {
  const svc = createServiceClient();
  const { data, error } = await svc.from("app_review_moderation_events").select("action, note, created_at, snapshot").eq("review_id", reviewId).order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({ action: row.action, note: row.note, createdAt: row.created_at, snapshot: row.snapshot }));
}

export async function peersFor(slug: string, exceptId: string | null): Promise<Pick<ReviewDraft, "title" | "pros" | "cons">[]> {
  const svc = createServiceClient();
  const query = svc.from("app_reviews").select("id, title, pros, cons").eq("slug", slug).neq("status", "removed").limit(100);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.filter((row) => row.id !== exceptId).map((row) => ({ title: row.title, pros: row.pros, cons: row.cons }));
}
