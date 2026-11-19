// What the outside services we pay for, besides the AI tools, cost per call (owner, 2026-11-17: the admin Usage and
// cost page counted AI only). Pure: the price of one Google Places or Firecrawl request from what it asked for.
//
// Google Places API (New), list prices per 1,000 calls for the first 100,000 a month, read 2026-11-17 from
// https://developers.google.com/maps/billing-and-pricing/pricing. A call is billed at the tier of the costliest field in
// its field mask. Each SKU also has free calls every month (Essentials 10,000, Pro 5,000, Enterprise 1,000), which are
// not taken off here, so the cost shown is the most the calls can cost.
//
// Firecrawl: a page scraped as markdown and HTML is 1 credit (https://www.firecrawl.dev/pricing, read 2026-11-17). The
// price of a credit depends on the plan, so it comes from FIRECRAWL_USD_PER_CREDIT (env.ts).

export type ServiceKey = "google_places" | "firecrawl";
export const SERVICE_LABELS: Record<ServiceKey, string> = { google_places: "Google Places", firecrawl: "Firecrawl website reads" };
/** usage_events.provider for each service; the AI rows use openai, anthropic and perplexity. */
export const SERVICE_PROVIDERS = new Set<string>(["google_places", "firecrawl"]);

type Tier = "ids" | "essentials" | "pro" | "enterprise" | "atmosphere";
const RANK: Tier[] = ["ids", "essentials", "pro", "enterprise", "atmosphere"];

// Fields by tier (Places API New data fields). A field not listed is priced as Enterprise, the safe side.
const TIER_OF: Record<string, Tier> = Object.fromEntries([
  ...["id", "name", "attributions"].map((f) => [f, "ids"]),
  ...["addressComponents", "adrFormatAddress", "formattedAddress", "location", "photos", "plusCode", "postalAddress", "shortFormattedAddress", "types", "viewport"].map((f) => [f, "essentials"]),
  ...[
    "accessibilityOptions",
    "businessStatus",
    "containingPlaces",
    "displayName",
    "googleMapsLinks",
    "googleMapsUri",
    "iconBackgroundColor",
    "iconMaskBaseUri",
    "primaryType",
    "primaryTypeDisplayName",
    "pureServiceAreaBusiness",
    "subDestinations",
    "utcOffsetMinutes",
  ].map((f) => [f, "pro"]),
  ...[
    "currentOpeningHours",
    "currentSecondaryOpeningHours",
    "internationalPhoneNumber",
    "nationalPhoneNumber",
    "priceLevel",
    "priceRange",
    "rating",
    "regularOpeningHours",
    "regularSecondaryOpeningHours",
    "userRatingCount",
    "websiteUri",
  ].map((f) => [f, "enterprise"]),
  ...["reviews", "editorialSummary", "generativeSummary", "reviewSummary"].map((f) => [f, "atmosphere"]),
]);

// USD per call. Text Search has no paid Essentials tier: Essentials fields are billed as Pro there; IDs only is free.
const DETAILS_USD: Record<Tier, number> = { ids: 0, essentials: 0.005, pro: 0.017, enterprise: 0.02, atmosphere: 0.025 };
const TEXT_SEARCH_USD: Record<Tier, number> = { ids: 0, essentials: 0.032, pro: 0.032, enterprise: 0.035, atmosphere: 0.04 };

/** The costliest tier among the fields asked for ("places.rating,places.id" or "regularOpeningHours.weekdayDescriptions"). */
export function placesTier(fieldMask: string): Tier {
  let top: Tier = "ids";
  for (const raw of fieldMask.split(",")) {
    const field = raw.trim().replace(/^places\./, "").split(".")[0];
    if (!field) continue;
    const tier = field === "*" ? "atmosphere" : (TIER_OF[field] ?? "enterprise");
    if (RANK.indexOf(tier) > RANK.indexOf(top)) top = tier;
  }
  return top;
}

export type PricedCall = { service: ServiceKey; sku: string; usd: number };

const TIER_NAME: Record<Tier, string> = { ids: "IDs only", essentials: "Essentials", pro: "Pro", enterprise: "Enterprise", atmosphere: "Enterprise and Atmosphere" };

/**
 * What one request to a paid service costs, from its address and field mask; null for anything else, or a call that
 * is free (an IDs-only lookup, like System status makes).
 */
export function priceCall(url: string, fieldMask: string | null, firecrawlUsdPerCredit: number): PricedCall | null {
  let host: string;
  let path: string;
  try {
    ({ host, pathname: path } = new URL(url));
  } catch {
    return null;
  }
  if (host === "places.googleapis.com") {
    const tier = placesTier(fieldMask ?? "*");
    const search = path.endsWith(":searchText");
    const usd = (search ? TEXT_SEARCH_USD : DETAILS_USD)[tier];
    return usd > 0 ? { service: "google_places", sku: `${search ? "Text Search" : "Place Details"} ${TIER_NAME[tier]}`, usd } : null;
  }
  if (host === "api.firecrawl.dev" && path.endsWith("/scrape")) return { service: "firecrawl", sku: "Scrape, 1 credit", usd: firecrawlUsdPerCredit };
  return null;
}
