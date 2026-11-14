// The brand a cited host belongs to, the way an owner says it: every Google host is "Google", foodpanda.pk and
// foodpanda.com are one "Foodpanda". Shared by the report (its fixes are keyed by brand) and the Sources page (which
// looks those fixes up in Actions), so both name a site the same way (QA round 2). Pure.

// Brand names as people write them. Matched on a whole part of the host, so "foodpanda.pk" is Foodpanda.
export const BRANDS: Record<string, string> = {
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

/** The brand key a host belongs to ("foodpanda" for foodpanda.pk), or null for a site that is not a known brand. */
export const brandOf = (host: string) => host.split(".").slice(0, -1).find((part) => Object.hasOwn(BRANDS, part)) ?? null;

/** True for any Google host (google.com, maps.google.com, google.com.pk) and Google's short links. */
export const isGoogle = (host: string) => brandOf(host) === "google" || host === "g.page" || host === "goo.gl" || host === "g.co";

/** The key a report fix about this site carries ("report:source:<key>"): "google", the brand, or the host itself. */
export const sourceBrandKey = (host: string) => (isGoogle(host) ? "google" : (brandOf(host) ?? host));
