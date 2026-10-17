export type ReviewStatus = "pending" | "published" | "rejected" | "removed";
export type Recommendation = "yes" | "no";
export type ReportReason = "spam" | "duplicate" | "not_a_customer" | "offensive" | "other";
export type ModerationAction = "submitted" | "edited" | "approved" | "rejected" | "removed" | "reported";

export type ReviewDraft = {
  slug: string;
  rating: number;
  title: string;
  useCase: string;
  pros: string;
  cons: string;
  recommendation: Recommendation;
  company: string | null;
  industry: string | null;
  role: string | null;
};

export type StoredReview = ReviewDraft & {
  id: string;
  userId: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  useCase: string;
  pros: string;
  cons: string;
  recommendation: Recommendation;
  label: string;
  industry: string | null;
  publishedAt: string | null;
  helpfulCount: number;
  mine: boolean;
};

export type NativeSummary = {
  average: number | null;
  count: number;
};

export type Reviewer = {
  userId: string;
  emailConfirmed: boolean;
};
