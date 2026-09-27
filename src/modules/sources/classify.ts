// Source types for the Sources page (B-54, MVP_SPEC 8.1). Labels follow the wording rules in MVP_SPEC 8.4.

export type SourceType = "own" | "reviews" | "directories" | "news" | "business";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  own: "Your website",
  reviews: "Reviews and forums",
  directories: "Directories",
  news: "News",
  business: "Business sites",
};

// Entries without a dot match a brand on any country domain (yelp matches yelp.com and m.yelp.co.uk);
// entries with a dot match that host and its subdomains.
const REVIEWS = [
  "yelp", "tripadvisor", "trustpilot", "reddit", "quora", "nextdoor", "facebook", "instagram", "tiktok",
  "youtube", "x.com", "twitter.com", "threads.net", "birdeye", "angieslist",
  "consumeraffairs", "sitejabber", "opentable", "zomato", "untappd", "beeradvocate",
  "houzz", "healthgrades", "vitals", "ratemds", "zocdoc", "avvo", "lawyers.com", "carfax", "cars.com",
  "dealerrater", "weddingwire", "theknot", "booksy", "vagaro", "fresha", "classpass", "mindbodyonline",
];
const DIRECTORIES = [
  "yellowpages", "yp.com", "superpages", "bbb.org", "manta", "chamberofcommerce", "angi", "homeadvisor",
  "thumbtack", "porch", "bark", "mapquest", "maps.apple.com", "google", "bing.com", "foursquare",
  "citysearch", "local.com", "merchantcircle", "hotfrog", "cylex", "brownbook", "ezlocal", "showmelocal",
  "n49", "yellowbook", "whitepages", "dexknows", "expertise.com", "threebestrated", "bestprosintown",
  "findlaw", "justia", "martindale", "doximity", "webmd", "npino", "grubhub", "doordash", "ubereats",
  "seamless", "postmates", "toasttab", "menupages", "allmenus", "restaurantji", "restaurantguru", "wanderlog",
  "zillow", "realtor.com", "apartments.com", "wikipedia.org", "wikivoyage.org",
];
const NEWS = [
  "patch.com", "eater", "timeout", "infatuation", "thrillist", "nytimes", "washingtonpost", "latimes",
  "usatoday", "cnn", "foxnews", "nbcnews", "abcnews", "cbsnews", "npr.org", "apnews", "reuters", "forbes",
  "businessinsider", "bizjournals", "sfgate", "sfchronicle", "chicagotribune", "bostonglobe", "ocregister",
  "dailypilot", "ktla", "abc7", "nbclosangeles", "yahoo", "msn", "axios", "vox", "buzzfeed", "sfist", "laist",
  "seattletimes", "dallasnews", "houstonchronicle", "denverpost", "azcentral", "tampabay", "miamiherald",
];
// Local papers and TV stations are too many to list; their names usually say what they are. Common words
// such as "times" only count as a whole part of the name, so "goodtimes-bar.com" stays a business site.
const NEWS_NAME = /tribune|gazette|herald|chronicle|newspaper|^news|news$|(^|[.-])(times|journal|courier|dispatch|magazine)([.-]|$)/;

/** The site's host without "www.", or null when the value is not a web address. */
export function hostOf(url: string): string | null {
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

function inList(host: string, list: string[]): boolean {
  // The last label is the country or top level domain, never the brand.
  const brands = host.split(".").slice(0, -1);
  return list.some((entry) =>
    entry.includes(".") ? host === entry || host.endsWith(`.${entry}`) : brands.includes(entry),
  );
}

/** True when `host` is the business's own site or one of its subdomains. */
export function isOwnSite(host: string, ownDomain: string | null): boolean {
  const own = ownDomain ? hostOf(ownDomain) : null;
  return !!own && (host === own || host.endsWith(`.${own}`));
}

/** What kind of website a cited host is. Unknown sites count as other businesses' sites. */
export function sourceType(host: string, ownDomain: string | null): SourceType {
  if (isOwnSite(host, ownDomain)) return "own";
  if (inList(host, REVIEWS)) return "reviews";
  if (inList(host, DIRECTORIES)) return "directories";
  if (inList(host, NEWS) || NEWS_NAME.test(host.split(".").slice(0, -1).join("."))) return "news";
  return "business";
}
