import { describe, expect, it } from "vitest";
import { reviewDraftSchema } from "./review-schema";
import {
  aggregateRatings,
  canSubmitReview,
  eventForSave,
  reviewerLabel,
  softwareReviewJsonLd,
  spamSignals,
  statusAfterDecision,
  statusAfterSave,
  summariesBySlug,
} from "./review-service";
import type { PublicReview, StoredReview } from "./review-types";

function review(overrides: Partial<StoredReview> = {}): StoredReview {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "chatgpt",
    userId: "user-1",
    status: "pending",
    rating: 5,
    title: "Useful for drafts",
    useCase: "I use it to draft customer emails.",
    pros: "Fast answers for first drafts.",
    cons: "It still needs a person to check facts.",
    recommendation: "yes",
    company: null,
    industry: null,
    role: null,
    createdAt: "2026-10-17T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
    publishedAt: null,
    ...overrides,
  };
}

describe("native app reviews", () => {
  it("keeps every new or edited review pending, including a five-star review", () => {
    expect(statusAfterSave(null)).toBe("pending");
    expect(statusAfterSave("published")).toBe("pending");
    expect(statusAfterSave("rejected")).toBe("pending");
    expect(statusAfterSave("removed")).toBeNull();
    expect(eventForSave(null)).toBe("submitted");
    expect(eventForSave("published")).toBe("edited");
    expect(statusAfterDecision("approve")).toBe("published");
    expect(statusAfterDecision("reject")).toBe("rejected");
    expect(canSubmitReview({ signedIn: false, emailConfirmed: false })).toEqual({ ok: false, code: "sign-in" });
    expect(canSubmitReview({ signedIn: true, emailConfirmed: false })).toEqual({ ok: false, code: "confirm-email" });
    expect(canSubmitReview({ signedIn: true, emailConfirmed: true })).toEqual({ ok: true });
  });

  it("counts only published reviews in the Customers.Direct aggregate", () => {
    const mixed = [
      review({ status: "published", rating: 5 }),
      review({ status: "published", rating: 4, id: "22222222-2222-2222-2222-222222222222" }),
      review({ status: "pending", rating: 1, id: "33333333-3333-3333-3333-333333333333" }),
      review({ status: "rejected", rating: 1, id: "44444444-4444-4444-4444-444444444444" }),
    ];
    expect(aggregateRatings(mixed)).toEqual({ average: 4.5, count: 2 });
    expect(aggregateRatings([review({ status: "pending" })])).toEqual({ average: null, count: 0 });
    expect(summariesBySlug([
      { slug: "chatgpt", status: "published", rating: 4 },
      { slug: "canva", status: "pending", rating: 5 },
    ])).toEqual({ chatgpt: { average: 4, count: 1 } });
  });

  it("flags duplicates without inventing a reviewer name", () => {
    const first = review();
    const copy = review({ id: "55555555-5555-5555-5555-555555555555", userId: "user-2" });
    expect(spamSignals(copy, [first])).toContain("duplicate");
    expect(spamSignals(review({ title: "aaaaaaaaaaaa", pros: "aaaaaaaaaaaa", cons: "aaaaaaaaaaaa" }), [])).toContain("repeated characters");
    expect(reviewerLabel({ company: null, role: null })).toBe("Customers.Direct member");
    expect(reviewerLabel({ company: "North Studio", role: "Owner" })).toBe("Owner at North Studio");
    const parsed = reviewDraftSchema.safeParse({ ...first, experienced: "yes", company: "", industry: "", role: "" });
    expect(parsed.success).toBe(true);
    expect(reviewDraftSchema.safeParse({ ...first, experienced: "no", company: "", industry: "", role: "" }).success).toBe(false);
  });

  it("adds aggregate structured data only after a review is published", () => {
    const empty = softwareReviewJsonLd({
      name: "ChatGPT",
      description: "Write, research, and answer questions in a conversation.",
      slug: "chatgpt",
      provider: "OpenAI",
      summary: { average: null, count: 0 },
      reviews: [],
    });
    expect(empty.aggregateRating).toBeUndefined();
    const published: PublicReview = {
      id: review().id,
      rating: 4,
      title: review().title,
      useCase: review().useCase,
      pros: review().pros,
      cons: review().cons,
      recommendation: "yes",
      label: "Customers.Direct member",
      industry: null,
      publishedAt: "2026-10-17T00:00:00.000Z",
      helpfulCount: 0,
      mine: false,
    };
    const live = softwareReviewJsonLd({
      name: "ChatGPT",
      description: "Write, research, and answer questions in a conversation.",
      slug: "chatgpt",
      provider: "OpenAI",
      summary: { average: 4, count: 1 },
      reviews: [published],
    });
    expect(live.aggregateRating).toMatchObject({ reviewCount: 1, ratingValue: "4.0" });
    expect(JSON.stringify(live)).not.toContain("user-1");
  });
});
