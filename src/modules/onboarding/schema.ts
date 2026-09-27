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
  description: string;
  services: string[];
  city: string;
  state: string;
  country: string;
  phone: string;
  address: string;
};

export type AutofillResult = {
  details: BusinessDetails;
  /** Which source filled at least one field. */
  filledFrom: { website: boolean; google: boolean };
  /** A friendly line shown above the form, or null when everything went normally. */
  note: string | null;
};
