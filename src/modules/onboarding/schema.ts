import { z } from "zod";
import { INDUSTRIES } from "./industries";

const hostname = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const autofillInput = z.union([
  z.object({
    businessId: z.uuid(),
    domain: z.string().trim().min(1).max(300),
  }),
  // "I don't have a website" (MVP_SPEC 3.3): Places is searched by name plus city.
  z.object({
    businessId: z.uuid(),
    name: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
  }),
]);

export type AutofillActionInput = z.infer<typeof autofillInput>;

/** Lowercase host without "www.", or null when it is not a public domain name. */
export function toDomain(raw: string): string | null {
  let host: string;
  try {
    const withScheme = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    host = url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  return hostname.test(host) ? host : null;
}

/** What the details form is pre-filled with (MVP_SPEC 3.1 step 4). Empty strings mean "not found". */
export type BusinessDetails = {
  name: string;
  industry: (typeof INDUSTRIES)[number] | "";
  /** With industry "other": what Google calls the business, "Bookstore" (BUG-123). */
  industryText?: string;
  description: string;
  services: string[];
  city: string;
  state: string;
  country: string;
  /** Neighborhood or area, "East Austin". From Google only as a pre-fill; saved once the user confirms. */
  area: string;
  phone: string;
  address: string;
};

export type AutofillResult = {
  details: BusinessDetails;
  /** Which source filled at least one field. */
  filledFrom: { website: boolean; google: boolean };
  /** A friendly line shown above the form, or null when everything went normally. */
  note: string | null;
  /**
   * No website (MVP_SPEC 3.3): the Google listings the user picks theirs from. Until they pick one, the form
   * keeps only what they typed and no place_id is saved. Shown live, never stored (D-73).
   */
  choices?: PlaceChoice[];
};

/** One Google listing offered as "is this your business?", with what the form gets if the user picks it. */
export type PlaceChoice = {
  placeId: string;
  name: string;
  address: string | null;
  autofill: AutofillResult;
};

// Place ids are opaque but URL-safe; anything else would change the Places request path.
export const placeIdPattern = /^[A-Za-z0-9_-]{10,300}$/;

/** The user's answer to "Is one of these your business?": a listing's place_id, or null for none of them. */
export const pickPlaceInput = z.object({
  businessId: z.uuid(),
  placeId: z.string().regex(placeIdPattern).nullable(),
});

const competitorName = z.string().trim().min(1).max(120);

export const competitorLookupInput = z.object({
  businessId: z.uuid(),
  name: competitorName.min(2),
});

export const saveCompetitorsInput = z.object({
  businessId: z.uuid(),
  // The plan limit is checked in the action; this only stops absurd payloads.
  competitors: z
    .array(z.object({ name: competitorName, placesId: z.string().regex(placeIdPattern).nullable() }))
    .max(50),
});
