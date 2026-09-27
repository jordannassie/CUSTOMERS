// Pure auto-fill rules (MVP_SPEC 3.2): which Places result is the business, how the two sources
// combine, and the note shown above the form.
import { industryFromPlacesType } from "./industries";
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
  phone: "",
  address: "",
};

export const NOTES = {
  nothingFound: "We couldn't find your business details automatically. Please fill in the form below.",
  googleOnly:
    "Your website didn't let us read it, so we filled in what we could from Google. Please check the details.",
  websiteOnly: "We filled this in from your website. Please check the details.",
} as const;

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Places matches only count when the listing's website is this domain (or a subdomain of it). */
export function sameSite(websiteUri: string | null, domain: string): boolean {
  const host = hostOf(websiteUri);
  return host !== null && (host === domain || host.endsWith(`.${domain}`));
}

export function pickPlaceForDomain(candidates: PlaceCandidate[], domain: string): PlaceCandidate | null {
  return candidates.find((c) => sameSite(c.websiteUri, domain)) ?? null;
}

const digits = (s: string) => s.replace(/\D/g, "");
const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

// A second line of defence against invented values: short facts the site states must appear in
// its text. Summaries (description, services) and normalised codes (state, country) are exempt.
export function keepGrounded(site: AutofillOutput, pages: PageResult[]): AutofillOutput {
  const text = pages.map((p) => `${p.title ?? ""}\n${p.markdown}`).join("\n");
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

/** Places wins for name, address, phone and category; the website wins for description and services. */
export function mergeDetails(site: AutofillOutput | null, place: PlaceCandidate | null): BusinessDetails {
  // When Places has an address, the location fields come from the same address so they agree.
  const placeLocation = place?.address ? place : null;
  return {
    name: place?.name || site?.name || "",
    industry: industryFromPlacesType(place?.primaryType) ?? site?.industry ?? "",
    description: site?.description.trim() ?? "",
    services: site?.services ?? [],
    city: (placeLocation ? placeLocation.city : site?.city) || "",
    state: (placeLocation ? placeLocation.state : site?.state) || "",
    country: (placeLocation ? placeLocation.country : site?.country) || "",
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
}): AutofillResult {
  const { details, fromWebsite, fromGoogle, hadWebsite } = opts;
  let note: string | null = null;
  if (!fromWebsite && !fromGoogle) note = NOTES.nothingFound;
  else if (hadWebsite && !fromWebsite) note = NOTES.googleOnly;
  else if (hadWebsite && !fromGoogle) note = NOTES.websiteOnly;
  return { details, filledFrom: { website: fromWebsite, google: fromGoogle }, note };
}

export function hasAnyValue(details: BusinessDetails): boolean {
  return Object.values(details).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
}
