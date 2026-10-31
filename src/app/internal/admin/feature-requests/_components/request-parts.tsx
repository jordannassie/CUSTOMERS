import { Badge } from "@/components/ui/badge";

export type Status = "new" | "reviewing" | "planned" | "shipped" | "declined";

export const FEATURE_FILTERS = ["all", "new", "reviewing", "planned", "shipped", "declined"] as const;
export type FeatureFilter = (typeof FEATURE_FILTERS)[number];

/** ?status= from the URL; anything unknown shows every request. */
export function featureFilter(value: unknown): FeatureFilter {
  return FEATURE_FILTERS.find((f) => f === value) ?? "all";
}

export interface FeatureRequest {
  id: string;
  userId: string;
  businessId: string | null;
  title: string;
  description: string;
  pageContext: string | null;
  status: string;
  createdAt: string;
  email: string;
  businessName: string | null;
}

export const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  reviewing: "Reviewing",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
};

const STATUS_VARIANTS: Record<Status, "tint" | "mid" | "secondary" | "good"> = {
  new: "tint",
  reviewing: "mid",
  planned: "secondary",
  shipped: "good",
  declined: "secondary",
};

export { formatDate } from "../../_components/format";

export function StatusBadge({ status }: { status: string }) {
  const s = (status in STATUS_LABELS ? status : "new") as Status;
  return <Badge variant={STATUS_VARIANTS[s]}>{STATUS_LABELS[s]}</Badge>;
}
