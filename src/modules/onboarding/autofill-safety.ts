// Auto-fill's safety net when no AI can read the site (D-84): a looser match between a Google listing's website
// and the domain, and the name and description the site's own page title and meta description give. Pure helpers.
import type { PageResult } from "./firecrawl";
import type { AutofillOutput } from "./prompts/business-autofill.v1";

// Second-level country suffixes: "adidas.com.pk", "bbc.co.uk".
const CC_SECOND_LEVEL = /^(com|co|net|org|gov|edu|ac|or|ne)\.[a-z]{2}$/;
const GENERIC_TLD = new Set(["com", "net", "org", "co", "biz", "info", "shop", "store"]);

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "shop.adidas.com.pk" is the "adidas" label under "com.pk". */
export function splitHost(host: string): { label: string; suffix: string } {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  const lastTwo = parts.slice(-2).join(".");
  if (parts.length >= 3 && CC_SECOND_LEVEL.test(lastTwo)) return { label: parts[parts.length - 3], suffix: lastTwo };
  return { label: parts[parts.length - 2] ?? "", suffix: parts[parts.length - 1] ?? "" };
}

const isBrandSuffix = (suffix: string) => GENERIC_TLD.has(suffix) || /^[a-z]{2}$/.test(suffix) || CC_SECOND_LEVEL.test(suffix);

/**
 * The listing's website is this business's site: the same domain or a subdomain either way ("shop.adidas.com"),
 * any path ("adidas.com/pk/..."), or the brand's country version ("adidas.com.pk", "adidas.de").
 */
export function sameBrandSite(websiteUri: string | null, domain: string): boolean {
  const host = hostOf(websiteUri);
  if (!host) return false;
  const typed = domain.toLowerCase().replace(/^www\./, "");
  if (host === typed || host.endsWith(`.${typed}`) || typed.endsWith(`.${host}`)) return true;
  const a = splitHost(host);
  const b = splitHost(typed);
  return a.label.length >= 3 && a.label === b.label && isBrandSuffix(a.suffix) && isBrandSuffix(b.suffix);
}

const compact = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const TITLE_SEPARATOR = /\s+[|–—-]\s+|\s*[|•·]\s*|:\s+/;
const TITLE_NOISE = [/^(welcome to|home)\s+/i, /\s+(official (web)?site|online (store|shop)|home ?page|home)$/i];

function cleanSegment(segment: string): string {
  return TITLE_NOISE.reduce((s, noise) => s.replace(noise, ""), segment.trim()).trim();
}

/**
 * The business name in a page title: "adidas Official Website | adidas US" gives "adidas", "First Light | Coffee in
 * Austin" gives "First Light" for firstlightaustin.com. The part that spells the domain's brand wins.
 */
export function nameFromTitle(title: string | null, domain: string): string {
  if (!title?.trim()) return "";
  const brand = splitHost(domain).label.replace(/-/g, "");
  const segments = title.split(TITLE_SEPARATOR).map(cleanSegment).filter((s) => s.length >= 2);
  if (segments.length === 0) return "";
  const exact = segments.find((s) => compact(s) === brand);
  if (exact) return exact;
  const spellsBrand = segments
    .filter((s) => compact(s).length >= 3 && (brand.includes(compact(s)) || compact(s).includes(brand)))
    .sort((x, y) => x.split(/\s+/).length - y.split(/\s+/).length);
  return (spellsBrand[0] ?? segments[0]).slice(0, 80);
}

/**
 * What the site's own page metadata says, for when no AI could read it: the home page title's brand as the name
 * and its meta description. Industry, services and location stay empty; Google or the user fills them.
 */
export function factsFromPageMeta(pages: PageResult[], domain: string): AutofillOutput | null {
  const home = pages.find((p) => p.path === "/" && (p.title || p.description)) ?? pages.find((p) => p.title || p.description);
  if (!home) return null;
  const name = nameFromTitle(home.title, domain);
  const description = (home.description ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!name && !description) return null;
  return {
    name,
    industry: "",
    description,
    services: [],
    city: "",
    state: "",
    country: "",
    phone: "",
    address: "",
    confidence: "low",
  };
}
