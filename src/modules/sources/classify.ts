// Source types for the Sources page (B-54, MVP_SPEC 8.1). Labels follow the wording rules in MVP_SPEC 8.4.
// The three top categories stay as they were; each site also gets a finer kind (dashboard redesign, 2026-10-27),
// so the owner sees a delivery app or a food guide, not just "Business sites". Pure.
import { sourceType, type SourceType } from "@/lib/site-type";

export { hostOf, isOwnSite, sourceType, type SourceType } from "@/lib/site-type";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  own: "Your website",
  reviews: "Reviews and forums",
  directories: "Directories",
  news: "News",
  business: "Business sites",
};

export const SUB_KINDS = [
  "own",
  "delivery",
  "competitor",
  "food_guide",
  "social",
  "reviews",
  "directory",
  "travel_guide",
  "news",
  "business",
] as const;
export type SubKind = (typeof SUB_KINDS)[number];

export const SUB_KIND_LABELS: Record<SubKind, string> = {
  own: "Your website",
  delivery: "Delivery app",
  competitor: "Competitor site",
  food_guide: "Food guide",
  social: "Social",
  reviews: "Reviews",
  directory: "Directory",
  travel_guide: "Travel guide",
  news: "News",
  business: "Business site",
};

/** "54 sites: delivery apps, competitor sites, food guides" under each kind of website. */
export const SUB_KIND_PLURALS: Record<SubKind, string> = {
  own: "your website",
  delivery: "delivery apps",
  competitor: "competitor sites",
  food_guide: "food guides",
  social: "social",
  reviews: "review sites",
  directory: "directories",
  travel_guide: "travel guides",
  news: "news",
  business: "business sites",
};

// Same matching as src/lib/site-type.ts: entries without a dot match a brand on any country domain, entries with a
// dot match that host and its subdomains.
const SOCIAL = ["facebook", "instagram", "tiktok", "youtube", "x.com", "twitter.com", "threads.net", "linkedin", "pinterest", "snapchat"];
const DELIVERY = [
  "doordash", "ubereats", "grubhub", "seamless", "postmates", "foodpanda", "deliveroo", "justeat", "just-eat", "menulog",
  "skipthedishes", "swiggy", "zomato", "talabat", "careem", "glovo", "wolt", "instacart", "gopuff", "trycaviar",
  "slicelife", "chownow", "beyondmenu", "eatstreet", "deliverydudes", "waiter.com",
];
const FOOD_GUIDES = [
  "eater", "infatuation", "theinfatuation", "timeout", "thrillist", "zagat", "michelin", "bonappetit", "seriouseats",
  "tasteatlas", "foodandwine", "saveur", "tastingtable", "chowhound", "foodnetwork",
];
const TRAVEL_GUIDES = [
  "trip.com", "lonelyplanet", "wanderlog", "wikivoyage.org", "expedia", "booking.com", "hotels.com", "kayak", "frommers",
  "fodors", "roughguides", "atlasobscura", "theculturetrip", "culturetrip", "holidify", "travelandleisure", "cntraveler",
];
// Unknown sites whose name says what they are. Only for sites that would otherwise be another business's own site,
// and checked after the competitor match, so a rival called "Foodie Pizza" stays a competitor site.
const FOOD_GUIDE_NAME = /foodie|cookbook|dining|eats$|^eat[a-z]|bestof|best-of|top10|guide/;
const TRAVEL_NAME = /travel|tourism|holiday|^visit[a-z]{3,}/;

function inList(host: string, list: string[]): boolean {
  const brands = host.split(".").slice(0, -1);
  return list.some((entry) => (entry.includes(".") ? host === entry || host.endsWith(`.${entry}`) : brands.includes(entry)));
}

/** The finer kind of a cited site. `isCompetitor`: the site belongs to a tracked or AI-named competitor. */
export function subKind(host: string, ownDomain: string | null, isCompetitor = false): SubKind {
  const type = sourceType(host, ownDomain);
  if (type === "own") return "own";
  if (inList(host, SOCIAL)) return "social";
  if (inList(host, DELIVERY)) return "delivery";
  if (inList(host, FOOD_GUIDES)) return "food_guide";
  if (inList(host, TRAVEL_GUIDES)) return "travel_guide";
  if (type === "reviews") return "reviews";
  if (type === "directories") return "directory";
  if (type === "news") return "news";
  if (isCompetitor) return "competitor";
  const name = host.split(".").slice(0, -1).join(".");
  if (TRAVEL_NAME.test(name)) return "travel_guide";
  if (FOOD_GUIDE_NAME.test(name)) return "food_guide";
  return "business";
}

/** True when the site can be another business's own website, so it may be a competitor's (BUG-100). */
export function canBeBusinessSite(host: string, ownDomain: string | null): boolean {
  if (sourceType(host, ownDomain) !== "business") return false;
  return ![SOCIAL, DELIVERY, FOOD_GUIDES, TRAVEL_GUIDES].some((list) => inList(host, list));
}
