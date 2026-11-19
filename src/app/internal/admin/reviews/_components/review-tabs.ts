import type { ReviewStatus } from "@/modules/apps-directory/review-types";

// Every review can be found again (admin audit 2026-11-12): all, the queue, then one tab per decision. "All" comes
// first as on every other admin tab bar (BUG-324); Pending stays the page's default.
export const REVIEW_TABS = ["all", "pending", "published", "rejected", "removed"] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending",
  published: "Published",
  rejected: "Rejected",
  removed: "Removed",
};

export const TAB_LABELS: Record<ReviewTab, string> = { ...STATUS_LABELS, all: "All" };

/** ?status= from the address; anything unknown opens the queue. */
export function reviewTab(value: unknown): ReviewTab {
  return REVIEW_TABS.find((tab) => tab === value) ?? "pending";
}

const REPORT_LABELS: Record<string, string> = {
  spam: "Reported as spam",
  duplicate: "Reported as a duplicate",
  not_a_customer: "Reported: not a real customer",
  offensive: "Reported as offensive",
  other: "Reported for another reason",
};

export function reportLabel(reason: string): string {
  return REPORT_LABELS[reason] ?? `Reported: ${reason.replace(/_/g, " ")}`;
}
