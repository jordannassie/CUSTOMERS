// The sites AI used, grouped the way an owner thinks of them: every Google host is "Google", foodpanda.pk and
// foodpanda.com are one "Foodpanda", and each has the area where its fix is made. Counts are answers, never visits.
// Only the host of each cited address is used; nothing from Google Places is read here (D-73). Pure.
import { isOwnSite } from "@/lib/site-type";
import { BRANDS, brandOf, isGoogle } from "@/lib/source-brand";
import { subKind, type SubKind } from "@/modules/sources";
import type { ReportArea } from "./snapshot-schema";

export type SourceRef = { key: string; label: string; area: ReportArea; kind: SubKind | "google" };


const AREA_OF: Record<SubKind, ReportArea> = {
  own: "website",
  delivery: "delivery",
  social: "social",
  reviews: "reviews",
  directory: "directories",
  food_guide: "blogs",
  travel_guide: "blogs",
  news: "blogs",
  competitor: "other",
  business: "other",
};

export { isGoogle };

/**
 * Which source a cited host belongs to. `competitorSite`: the host is a tracked competitor's own website. Own and
 * other businesses' sites keep their host as the label, with the "website" and "other" areas.
 */
export function sourceOf(host: string, ownDomain: string | null, competitorSite = false): SourceRef {
  if (isOwnSite(host, ownDomain)) return { key: "own", label: host, area: "website", kind: "own" };
  if (isGoogle(host)) return { key: "google", label: "Google", area: "google", kind: "google" };
  const kind = subKind(host, ownDomain, competitorSite);
  const brand = brandOf(host);
  return { key: brand ?? host, label: brand ? BRANDS[brand] : host, area: AREA_OF[kind], kind };
}

/** Sources whose fix is made somewhere other than a business's own website. */
export const isListing = (area: ReportArea) => area !== "website" && area !== "other";
