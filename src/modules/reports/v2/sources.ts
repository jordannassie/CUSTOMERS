// The sites AI used, grouped the way an owner thinks of them: every Google host is "Google", foodpanda.pk and
// foodpanda.com are one "Foodpanda", and each has the area where its fix is made. Counts are answers, never visits.
// Only the host of each cited address is used; nothing from Google Places is read here (D-73). Pure.
import { isOwnSite } from "@/lib/site-type";
import { subKind, type SubKind } from "@/modules/sources";
import type { ReportArea } from "./snapshot-schema";

export type SourceRef = { key: string; label: string; area: ReportArea; kind: SubKind | "google" };

// Brand names as people write them. Matched on a whole part of the host, so "foodpanda.pk" is Foodpanda.
const BRANDS: Record<string, string> = {
  google: "Google",
  tripadvisor: "TripAdvisor",
  yelp: "Yelp",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  reddit: "Reddit",
  quora: "Quora",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  twitter: "X",
  x: "X",
  foodpanda: "Foodpanda",
  doordash: "DoorDash",
  ubereats: "Uber Eats",
  grubhub: "Grubhub",
  deliveroo: "Deliveroo",
  justeat: "Just Eat",
  zomato: "Zomato",
  swiggy: "Swiggy",
  talabat: "Talabat",
  trustpilot: "Trustpilot",
  nextdoor: "Nextdoor",
  yellowpages: "Yellow Pages",
  bbb: "BBB",
  angi: "Angi",
  thumbtack: "Thumbtack",
  houzz: "Houzz",
  opentable: "OpenTable",
  healthgrades: "Healthgrades",
  zocdoc: "Zocdoc",
  foursquare: "Foursquare",
  wikipedia: "Wikipedia",
  bing: "Bing",
  apple: "Apple Maps",
};

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

const brandOf = (host: string) => host.split(".").slice(0, -1).find((part) => Object.hasOwn(BRANDS, part)) ?? null;

/** True for any Google host (google.com, maps.google.com, google.com.pk) and Google's short links. */
export const isGoogle = (host: string) => brandOf(host) === "google" || host === "g.page" || host === "goo.gl" || host === "g.co";

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
