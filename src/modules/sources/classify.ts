// Source types for the Sources page (B-54, MVP_SPEC 8.1). Labels follow the wording rules in MVP_SPEC 8.4.
import type { SourceType } from "@/lib/site-type";

export { hostOf, isOwnSite, sourceType, type SourceType } from "@/lib/site-type";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  own: "Your website",
  reviews: "Reviews and forums",
  directories: "Directories",
  news: "News",
  business: "Business sites",
};
