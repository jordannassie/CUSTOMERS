// What kind of website a cited host is (B-54, MVP_SPEC 8.1). Pure, so the Sources page and the "why competitors
// win" facts classify sites the same way (BUG-100).

export type SourceType = "own" | "reviews" | "directories" | "news" | "business";

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
  "seattletimes", "statesman", "dallasnews", "houstonchronicle", "denverpost", "azcentral", "tampabay", "miamiherald",
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

/** Who owns a cited business website (shared with insights/sites.ts, BUG-100). */
const compact = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

// "com" in dominos.com.pk, "co" in example.co.uk: part of the country's ending, never the brand.
const SECOND_LEVEL = new Set(["com", "co", "net", "org", "gov", "edu", "ac", "biz", "info"]);

/** The domain without its ending, as one word: "dominos.com.pk" and "dominos.com" both give "dominos". */
function brandLabel(domain: string): string {
  const labels = domain.toLowerCase().split(".");
  const ending = labels.pop() ?? "";
  if (ending.length === 2 && labels.length > 1 && SECOND_LEVEL.has(labels.at(-1)!)) labels.pop();
  return compact(labels.join(""));
}

/** The business whose own website this is, when its name matches the domain: abacusplumbing.com is Abacus Plumbing's. */
export function siteOwner(domain: string, names: string[]): string | null {
  const label = brandLabel(domain);
  if (label.length < 4) return null;
  for (const name of names) {
    // "Abacus Plumbing, Air Conditioning & Electrical" starts with abacusplumbing.
    const want = compact(name);
    if (want.length < 4) continue;
    if (label === want || (label.length >= 6 && (want.startsWith(label) || label.startsWith(want)))) return name;
  }
  return null;
}
