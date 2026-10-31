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

// Trade words a brand runs into in a web address: "bennucoffee" is "Bennu Coffee" (2026-10-16). Google finds the
// spaced name more often than the joined one, so it is searched first.
const TRADE_WORDS = [
  "coffee", "cafe", "roasters", "bakery", "bakeshop", "pizza", "grill", "kitchen", "tacos", "burgers", "bistro",
  "dental", "dentistry", "smiles", "plumbing", "plumber", "heating", "cooling", "hvac", "electric", "roofing",
  "salon", "spa", "medspa", "studio", "fitness", "gym", "law", "legal", "realty", "homes", "auto", "motors",
  "books", "toys", "flowers", "florist", "vet", "clinic", "wellness", "yoga", "barber",
];

/** "bennucoffee" gives "bennu coffee"; null when no trade word follows a brand of at least 3 letters. */
export function spacedBrand(label: string): string | null {
  for (const word of TRADE_WORDS) {
    const at = label.indexOf(word);
    if (at >= 3 && at + word.length <= label.length) {
      const rest = label.slice(at + word.length);
      return [label.slice(0, at), word, rest].filter(Boolean).join(" ");
    }
  }
  return null;
}

// Each guess is one Places Text Search in the Enterprise tier (websiteUri, which picks the listing, is in it).
export const MAX_BRAND_SEARCHES = 2;

/**
 * "ebookwoman.com" gives ["ebookwoman", "bookwoman"]; "the-book-woman.co.uk" gives ["the book woman", "bookwoman"].
 * A hyphenated name is searched spaced only: Google finds "book woman" and "bookwoman" alike. At most 2 searches.
 */
export function brandGuesses(domain: string): string[] {
  const parts = domain.toLowerCase().split(".");
  const label = (parts.length >= 3 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2]) ?? "";
  const spaced = label.includes("-") ? null : spacedBrand(label);
  const guesses = [...(spaced ? [spaced] : []), label.includes("-") ? label.replace(/-+/g, " ") : label];
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
