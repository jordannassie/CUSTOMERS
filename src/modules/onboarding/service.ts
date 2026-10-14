// Pure auto-fill rules (MVP_SPEC 3.2): which Places result is the business, how the two sources
// combine, and the note shown above the form.
import { hostOf as siteHost } from "@/lib/site-type";
import { sameBrandSite } from "./autofill-safety";
import { INDUSTRY_LABELS } from "@/lib/industries";
import { industriesFromPlacesTypes, industryFromPlacesType, placesTypeLabel } from "./industries";
import type { PageResult } from "./firecrawl";
import type { PlaceCandidate } from "./places";
import type { AutofillOutput } from "./prompts/business-autofill.v1";
import type { AutofillResult, BusinessDetails } from "./schema";

export const EMPTY_DETAILS: BusinessDetails = {
  name: "",
  industry: "",
  description: "",
  services: [],
  city: "",
  state: "",
  country: "",
  area: "",
  phone: "",
  address: "",
};

export const NOTES = {
  nothingFound: "We couldn't find your business details automatically. Please fill in the form below.",
  googleOnly:
    "Your website didn't let us read it, so we filled in what we could from Google. Please check the details.",
  // Shown under "We filled this in from your website", so it says what that line does not (it used to repeat it).
  websiteOnly: "We didn't find it on Google, so check the address and phone in particular.",
  chain:
    "This website has several locations, so we left out the address. Enter the city and address of yours, and check the description fits it.",
  noneChosen: "We kept the name and city you typed. Fill in the rest below.",
  // The AI that reads websites is down (both Claude and the ChatGPT backup), not that the business is unknown.
  unavailable: "Auto-fill is temporarily unavailable, please fill in the form.",
  unavailablePartly: "Auto-fill is temporarily unavailable, so we filled in what we could. Please check the details and fill in the rest.",
} as const;

// One reading of a web address for every caller (lib/site-type.ts); a listing may have none.
const hostOf = (url: string | null): string | null => (url ? siteHost(url) : null);

/** Places matches only count when the listing's website is this domain (or a subdomain of it). */
export function sameSite(websiteUri: string | null, domain: string): boolean {
  const host = hostOf(websiteUri);
  return host !== null && (host === domain || host.endsWith(`.${domain}`));
}

/** The listing whose website is this site: same domain, a subdomain, any path, or the brand's country version. */
export function pickPlaceForDomain(candidates: PlaceCandidate[], domain: string): PlaceCandidate | null {
  return candidates.find((c) => sameSite(c.websiteUri, domain)) ?? candidates.find((c) => sameBrandSite(c.websiteUri, domain)) ?? null;
}

/**
 * True when the domain's Google results are branches in more than one city (a chain like mrrooter.com). Any one of
 * them would be a guess: Mr. Rooter came in as Seattle with an Oklahoma City description (BUG-117).
 */
export function isChain(candidates: PlaceCandidate[], domain: string): boolean {
  const cities = candidates
    .filter((c) => sameSite(c.websiteUri, domain) && c.city)
    .map((c) => `${c.city}|${c.state ?? ""}`.toLowerCase());
  return new Set(cities).size > 1;
}

/** A chain site's pages can be any branch's: its location facts are dropped, and a description naming a place. */
export function withoutBranchFacts(site: AutofillOutput, branches: PlaceCandidate[]): AutofillOutput {
  const places = [site.city, ...branches.map((b) => b.city)].filter((c): c is string => !!c?.trim());
  const namesPlace = places.some((c) => new RegExp(`\\b${c.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(site.description));
  return { ...site, city: "", state: "", address: "", phone: "", description: namesPlace ? "" : site.description };
}

const digits = (s: string) => s.replace(/\D/g, "");
const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

// A second line of defence against invented values: short facts the site states must appear in
// its text. Summaries (description, services) and normalised codes (state, country) are exempt.
export function keepGrounded(site: AutofillOutput, pages: PageResult[]): AutofillOutput {
  const text = pages.map((p) => `${p.title ?? ""}\n${p.markdown}\n${p.footer ?? ""}`).join("\n");
  const textPlain = plain(text);
  const textDigits = digits(text);
  const found = (value: string) => !value || textPlain.includes(plain(value));
  const phoneFound = (value: string) => !value || (digits(value).length >= 7 && textDigits.includes(digits(value)));
  return {
    ...site,
    name: found(site.name) ? site.name.trim() : "",
    city: found(site.city) ? site.city.trim() : "",
    address: found(site.address) ? site.address.trim() : "",
    phone: phoneFound(site.phone) ? site.phone.trim() : "",
    services: [...new Set(site.services.map((s) => s.trim()).filter(Boolean))].slice(0, 12),
  };
}

type ChosenIndustry = Pick<BusinessDetails, "industry" | "industryText">;

/**
 * Google's type wins: a known one is the industry, any other specific one is "other" with Google's name for it
 * (BUG-123). One exception: when the website says another of our industries and one of the listing's other types
 * maps to it, the website wins. A Tim Hortons is primaryType restaurant with types cafe and coffee_shop; its site
 * says coffee shop, and coffee shop questions fit it. A bookstore whose primary type is book_store stays
 * "Other: Bookstore" even when it lists a cafe, since only a mapped Google industry can be overruled this way.
 */
export function chooseIndustry(site: AutofillOutput | null, place: PlaceCandidate | null): ChosenIndustry {
  const google = industryFromPlacesType(place?.primaryType);
  const otherType = placesTypeLabel(place?.primaryType);
  const website = site?.industry && site.industry !== "other" ? site.industry : null;
  if (google && website && website !== google && industriesFromPlacesTypes(place?.types ?? []).has(website)) {
    return { industry: website };
  }
  return { industry: google ?? (otherType ? "other" : (site?.industry ?? "")), ...(otherType ? { industryText: otherType } : {}) };
}

/**
 * When Google and the website still name different kinds of business, both labels, so the details step can ask the
 * user to check: "Google says Restaurant, your website looks like Coffee shop." Null when they agree or one is silent.
 */
export function industryCheck(site: AutofillOutput | null, place: PlaceCandidate | null): { google: string; website: string } | null {
  const website = site?.industry && site.industry !== "other" ? site.industry : null;
  if (!website || !place) return null;
  const google = industryFromPlacesType(place.primaryType);
  const googleLabel = google ? INDUSTRY_LABELS[google] : placesTypeLabel(place.primaryType);
  if (!googleLabel || chooseIndustry(site, place).industry === website) return null;
  return { google: googleLabel, website: INDUSTRY_LABELS[website] };
}

/** Places wins for name, address, phone and category; the website wins for description and services. */
export function mergeDetails(site: AutofillOutput | null, place: PlaceCandidate | null): BusinessDetails {
  // When Places has an address, the location fields come from the same address so they agree.
  const placeLocation = place?.address ? place : null;
  return {
    name: place?.name || site?.name || "",
    ...chooseIndustry(site, place),
    description: site?.description.trim() ?? "",
    services: site?.services ?? [],
    city: (placeLocation ? placeLocation.city : site?.city) || "",
    state: (placeLocation ? placeLocation.state : site?.state) || "",
    country: (placeLocation ? placeLocation.country : site?.country) || "",
    // Only Google names the neighborhood; the site extraction has no such field.
    area: placeLocation?.area || "",
    phone: place?.phone || site?.phone || "",
    address: place?.address || site?.address || "",
  };
}

/** MVP_SPEC 3.2: one retry with Sonnet when the name or industry is empty or confidence is low. */
export function needsRetry(site: AutofillOutput, merged: BusinessDetails): boolean {
  return !merged.name || !merged.industry || site.confidence === "low";
}

export function toResult(opts: {
  details: BusinessDetails;
  fromWebsite: boolean;
  fromGoogle: boolean;
  hadWebsite: boolean;
  chain?: boolean;
  /** A source failed (no AI could read the site, Firecrawl or Google refused): say so rather than "not found". */
  aiDown?: boolean;
  /** Google and the website name different kinds of business; the details step asks the user to check. */
  industryCheck?: { google: string; website: string } | null;
}): AutofillResult {
  const { details, fromWebsite, fromGoogle, hadWebsite } = opts;
  let note: string | null = null;
  if (opts.chain) note = NOTES.chain;
  else if (opts.aiDown) note = fromWebsite || fromGoogle ? NOTES.unavailablePartly : NOTES.unavailable;
  else if (!fromWebsite && !fromGoogle) note = NOTES.nothingFound;
  else if (hadWebsite && !fromWebsite) note = NOTES.googleOnly;
  else if (hadWebsite && !fromGoogle) note = NOTES.websiteOnly;
  return {
    details,
    filledFrom: { website: fromWebsite, google: fromGoogle },
    note,
    ...(opts.industryCheck ? { industryCheck: opts.industryCheck } : {}),
  };
}

export function hasAnyValue(details: BusinessDetails): boolean {
  return Object.values(details).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
}
