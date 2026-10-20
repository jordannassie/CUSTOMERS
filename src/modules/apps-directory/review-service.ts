import type { ModerationAction, NativeSummary, PublicReview, ReviewDraft, ReviewStatus, StoredReview } from "./review-types";

export function canSubmitReview(input: { signedIn: boolean; emailConfirmed: boolean }): { ok: true } | { ok: false; code: "sign-in" | "confirm-email" } {
  if (!input.signedIn) return { ok: false, code: "sign-in" };
  if (!input.emailConfirmed) return { ok: false, code: "confirm-email" };
  return { ok: true };
}

/** A new or edited review always waits for moderation. The star rating does not change that. */
export function statusAfterSave(current: ReviewStatus | null): ReviewStatus | null {
  if (current === "removed") return null;
  return "pending";
}

export function statusAfterDecision(decision: "approve" | "reject" | "remove"): ReviewStatus {
  if (decision === "approve") return "published";
  if (decision === "reject") return "rejected";
  return "removed";
}

export function eventForSave(current: ReviewStatus | null): ModerationAction {
  return current ? "edited" : "submitted";
}

export function eventForDecision(decision: "approve" | "reject" | "remove"): ModerationAction {
  if (decision === "approve") return "approved";
  if (decision === "reject") return "rejected";
  return "removed";
}

export function aggregateRatings(reviews: { status: ReviewStatus; rating: number }[]): NativeSummary {
  const published = reviews.filter((review) => review.status === "published" && review.rating >= 1 && review.rating <= 5);
  if (published.length === 0) return { average: null, count: 0 };
  const total = published.reduce((sum, review) => sum + review.rating, 0);
  return { average: Math.round((total / published.length) * 10) / 10, count: published.length };
}

export function summariesBySlug(reviews: { slug: string; status: ReviewStatus; rating: number }[]): Record<string, NativeSummary> {
  const grouped = new Map<string, { status: ReviewStatus; rating: number }[]>();
  for (const review of reviews) {
    const list = grouped.get(review.slug) ?? [];
    list.push(review);
    grouped.set(review.slug, list);
  }
  const summaries: Record<string, NativeSummary> = {};
  for (const [slug, list] of grouped) {
    const summary = aggregateRatings(list);
    if (summary.count > 0) summaries[slug] = summary;
  }
  return summaries;
}

export function reviewFingerprint(review: Pick<ReviewDraft, "title" | "pros" | "cons">): string {
  return [review.title, review.pros, review.cons].map((part) => part.toLowerCase().replace(/\s+/g, " ").trim()).join("|");
}

export function spamSignals(review: Pick<ReviewDraft, "title" | "pros" | "cons">, peers: Pick<ReviewDraft, "title" | "pros" | "cons">[]): string[] {
  const signals: string[] = [];
  const fingerprint = reviewFingerprint(review);
  if (peers.some((peer) => reviewFingerprint(peer) === fingerprint)) signals.push("duplicate");
  const compact = `${review.title}${review.pros}${review.cons}`.replace(/\s+/g, "");
  if (compact.length >= 12 && new Set(compact).size <= 2) signals.push("repeated characters");
  return signals;
}

export function reviewerLabel(input: { company: string | null; role: string | null }): string {
  if (input.role && input.company) return `${input.role} at ${input.company}`;
  if (input.company) return input.company;
  if (input.role) return input.role;
  return "Customers.Direct member";
}

export function toPublicReview(review: StoredReview, helpfulCount: number, viewerId: string | null): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    useCase: review.useCase,
    pros: review.pros,
    cons: review.cons,
    recommendation: review.recommendation,
    label: reviewerLabel(review),
    industry: review.industry,
    publishedAt: review.publishedAt,
    helpfulCount,
    mine: viewerId !== null && viewerId === review.userId,
  };
}

export function softwareReviewJsonLd(input: {
  name: string;
  description: string;
  slug: string;
  provider: string;
  summary: NativeSummary;
  reviews: PublicReview[];
}): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description,
    url: `https://customers.direct/apps/${input.slug}`,
    applicationCategory: "BusinessApplication",
    provider: { "@type": "Organization", name: input.provider },
  };
  if (input.summary.count > 0 && input.summary.average !== null) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.summary.average.toFixed(1),
      reviewCount: input.summary.count,
      bestRating: 5,
      worstRating: 1,
    };
    data.review = input.reviews.map((review) => ({
      "@type": "Review",
      name: review.title,
      reviewBody: review.useCase,
      datePublished: review.publishedAt,
      author: { "@type": "Person", name: review.label },
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    }));
  }
  return data;
}

export function snapshotOf(review: StoredReview): Record<string, unknown> {
  return {
    status: review.status,
    rating: review.rating,
    title: review.title,
    useCase: review.useCase,
    pros: review.pros,
    cons: review.cons,
    recommendation: review.recommendation,
  };
}
