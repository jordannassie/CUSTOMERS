// When a website can't be read and Google does not list it by its address, Google is asked for the brand the
// domain spells (B7): "ebookwoman.com" is BookWoman. Pure helpers; the search itself is injected by autofill.ts.
import type { PlaceCandidate } from "./places";
import { sameBrandSite } from "./autofill-safety";
import { sameSite } from "./service";

export type AutofillProvider = "firecrawl" | "google_places" | "anthropic";
/** Why a source gave nothing: logged on the server and in provider_errors, never shown to the user. */
export type AutofillProblem = { provider: AutofillProvider; message: string };

// Letters people put in front of a brand in a web address: "ebookwoman", "thebookwoman", "getfoo".
const DOMAIN_PREFIXES = ["the", "my", "get", "shop", "visit", "go", "e"];

// Each guess is one Places Text Search in the Enterprise tier (websiteUri, which picks the listing, is in it).
export const MAX_BRAND_SEARCHES = 2;

/**
 * "ebookwoman.com" gives ["ebookwoman", "bookwoman"]; "the-book-woman.co.uk" gives ["the book woman", "bookwoman"].
 * A hyphenated name is searched spaced only: Google finds "book woman" and "bookwoman" alike. At most 2 searches.
 */
export function brandGuesses(domain: string): string[] {
  const parts = domain.toLowerCase().split(".");
  const label = (parts.length >= 3 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2]) ?? "";
  const guesses = [label.includes("-") ? label.replace(/-+/g, " ") : label];
  for (const prefix of DOMAIN_PREFIXES) {
    const rest = label.replace(/-+/g, "");
    if (rest.startsWith(prefix) && rest.length - prefix.length >= 4) guesses.push(rest.slice(prefix.length));
  }
  return [...new Set(guesses.filter((g) => g.trim().length >= 3))].slice(0, MAX_BRAND_SEARCHES);
}

/**
 * The listing that is this business: only one whose website is this site, a subdomain, a path on it or the brand's
 * country version ("adidas.com.pk" for adidas.com). The brand search has no city, so a listing with no website that
 * only shares the name ("Blue Door" for bluedoor.com, "Bakery" for thebakery.com) may be a business anywhere else,
 * and is never adopted.
 */
export function pickBrandPlace(candidates: PlaceCandidate[], domain: string): PlaceCandidate | null {
  return candidates.find((c) => sameSite(c.websiteUri, domain)) ?? candidates.find((c) => sameBrandSite(c.websiteUri, domain)) ?? null;
}
