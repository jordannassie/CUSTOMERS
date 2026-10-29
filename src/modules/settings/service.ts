// Pure rules for the Settings page (B-55). No framework, database or env imports, so the forms use them too.
import { needsClearerIndustry } from "@/lib/other-label";
import { ALIASES_MAX, PHONE_MAX, PHONE_PATTERN, SERVICE_MAX_CHARS, SERVICES_MAX, type Frequency, type ModelId } from "./schema";

// MVP_SPEC 4.5.
export const MODELS: { id: ModelId; label: string; explanation: string }[] = [
  { id: "openai", label: "ChatGPT", explanation: "The most widely used AI assistant." },
  { id: "anthropic", label: "Claude", explanation: "Growing fast, popular with professionals." },
  { id: "perplexity", label: "Perplexity", explanation: "An AI search engine. Always checks the web and shows its sources." },
];

export function untickWarning(label: string): string {
  return `You won't see whether ${label} recommends you. Customers using it are invisible to your report.`;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

/** "https://www.Example.com/about?x=1" becomes "www.example.com". Empty means no website. */
export function normalizeWebsite(input: string): { ok: true; domain: string | null } | { ok: false } {
  const raw = input.trim().toLowerCase();
  if (!raw) return { ok: true, domain: null };
  const host = raw.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  const valid = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host);
  return valid ? { ok: true, domain: host } : { ok: false };
}

/** Commas or new lines separate services; blanks and repeats are dropped. */
export function parseServices(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => {
      const key = s.toLowerCase();
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

// SVG is left out on purpose: the bucket is public and an SVG can carry script.
const LOGO_TYPES = [
  { contentType: "image/png", matches: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { contentType: "image/jpeg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    contentType: "image/webp",
    matches: (b: Uint8Array) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
];

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.subarray(from, to));
}

export const LOGO_RULES = "PNG, JPG or WebP, up to 2 MB.";

/** Checks the file's own bytes, not just the type the browser sent. */
export function checkLogo(size: number, head: Uint8Array): { ok: true; contentType: string } | { ok: false; error: string } {
  if (size === 0) return { ok: false, error: `Choose an image. ${LOGO_RULES}` };
  if (size > LOGO_MAX_BYTES) return { ok: false, error: `That file is too big. ${LOGO_RULES}` };
  const type = LOGO_TYPES.find((t) => t.matches(head));
  if (!type) return { ok: false, error: `That file type isn't supported. ${LOGO_RULES}` };
  return { ok: true, contentType: type.contentType };
}

/** What mention detection matches a business by (scanning's mentionTargets): its names, website, phone, city and area. */
export type MatchedFields = {
  name: string;
  aliases: string[];
  domain: string | null;
  phone: string | null;
  city: string | null;
  area: string | null;
};

/**
 * Whether a save changed what saved answers are matched by, so they must be checked again: the name, the other names
 * (in any way but order or case), the website, the phone (its digits), the city or the area (case aside).
 */
export function matchingChanged(before: MatchedFields, after: MatchedFields): boolean {
  const set = (list: string[]) => [...new Set(list.map((a) => a.trim().toLowerCase()))].sort().join("\n");
  const text = (v: string | null) => (v ?? "").trim().toLowerCase();
  const digits = (v: string | null) => (v ?? "").replace(/\D/g, "");
  return (
    before.name.trim() !== after.name.trim() ||
    set(before.aliases) !== set(after.aliases) ||
    text(before.domain) !== text(after.domain) ||
    digits(before.phone) !== digits(after.phone) ||
    text(before.city) !== text(after.city) ||
    text(before.area) !== text(after.area)
  );
}

/** Whether the website is another site now (case and "www." aside), so what was read from the old one is out of date. */
export function websiteChanged(before: string | null, after: string | null): boolean {
  const site = (v: string | null) => (v ?? "").trim().toLowerCase().replace(/^www\./, "");
  return site(before) !== site(after);
}

/** What is wrong with a typed list of other names, for the field's message; undefined when it can be saved. */
export function aliasesProblem(names: string[]): string | undefined {
  if (names.length > ALIASES_MAX) return `Add up to ${ALIASES_MAX} other names.`;
  if (names.some((n) => n.length < 2)) return "Each other name needs at least 2 characters.";
  if (names.some((n) => n.length > 120)) return "Keep each other name under 120 characters.";
  return undefined;
}

/** What is wrong with the typed services, for the field's message; undefined when they can be saved. */
export function servicesProblem(services: string[]): string | undefined {
  if (services.length > SERVICES_MAX) return `Add up to ${SERVICES_MAX} services.`;
  if (services.some((s) => s.length > SERVICE_MAX_CHARS)) return `Keep each service to ${SERVICE_MAX_CHARS} characters or fewer.`;
  return undefined;
}

/** What is wrong with the typed phone number, for the field's message; undefined when it can be saved. */
export function phoneProblem(phone: string): string | undefined {
  const typed = phone.trim();
  if (typed.length > PHONE_MAX) return `Keep the phone number to ${PHONE_MAX} characters or fewer.`;
  if (!PHONE_PATTERN.test(typed)) return "Use only numbers, spaces and + ( ) - in the phone number.";
  return undefined;
}

/** The profile fields a refused save can point at, so the form marks the field instead of a vague alert. */
export const PROFILE_FIELDS = ["name", "industry", "website", "services", "aliases", "phone"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

const FIELD_TEXT: Record<ProfileField, string> = {
  name: "Enter the business name, up to 120 characters.",
  industry: "Keep the industry to 80 characters or fewer.",
  website: "Enter a website like yourbusiness.com, or leave it empty.",
  services: `Add up to ${SERVICES_MAX} services, each ${SERVICE_MAX_CHARS} characters or fewer.`,
  aliases: `Add up to ${ALIASES_MAX} other names, each 2 to 120 characters.`,
  phone: `Enter a phone number of up to ${PHONE_MAX} characters, using only numbers, spaces and + ( ) -.`,
};

/** The field and message for the first problem zod found in a profile save, or null when it is not one field's. */
export function profileFieldError(issues: { path: PropertyKey[] }[]): { field: ProfileField; error: string } | null {
  for (const issue of issues) {
    const field = PROFILE_FIELDS.find((f) => f === issue.path[0]);
    if (field) return { field, error: FIELD_TEXT[field] };
  }
  return null;
}

// Legal endings are not part of what customers call a business.
const LEGAL_ENDINGS = new Set(["llc", "inc", "ltd", "co", "corp", "pllc", "plc", "lp", "llp"]);

/**
 * The "Other names" placeholder from the business's own name: the first letter of each word, "Kentucky Fried Chicken"
 * gives "For example: KFC". A one-word name has no short form, so an old name is suggested instead.
 */
export function aliasExample(name: string): string {
  const words = name
    .split(/[\s/-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !LEGAL_ENDINGS.has(w.toLowerCase()));
  const initials = words.map((w) => w[0].toUpperCase()).join("");
  return initials.length >= 2 ? `For example: ${initials}` : "For example: an old name or another spelling";
}

/**
 * True when a profile save changes the industry to a vague "Other" label ("Consultant", "Store"): questions are
 * written from that label. One saved before this rule stays while other fields change (2026-10-16).
 */
export function refusesOtherLabel(before: string | null, next: string): boolean {
  return next !== (before ?? "") && needsClearerIndustry(next);
}
