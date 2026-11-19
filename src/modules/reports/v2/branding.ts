// Agency branding for the report, from agencies.report_branding (jsonb: accent, contactEmail, bookingUrl). Anything
// that does not parse is left out, so a bad value never breaks a report. Pure.
import { z } from "zod";

export const DEFAULT_ACCENT = "#1F4FD1";

const branding = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().catch(undefined),
  contactEmail: z.email().optional().catch(undefined),
  bookingUrl: z.url({ protocol: /^https?$/ }).optional().catch(undefined),
});

export type Branding = { accent: string; contactEmail: string | null; bookingUrl: string | null };

export function readBranding(value: unknown): Branding {
  const parsed = branding.safeParse(value && typeof value === "object" && !Array.isArray(value) ? value : {});
  const b = parsed.success ? parsed.data : {};
  return { accent: b.accent ?? DEFAULT_ACCENT, contactEmail: b.contactEmail ?? null, bookingUrl: b.bookingUrl ?? null };
}

/**
 * True when the agency has no real name to show a client: empty, or only the start of the owner's email ("admin" for
 * admin@agency.com), which is what people type when they skip the name (QA round 2: PDFs said "Prepared by admin").
 */
export function isPlaceholderAgencyName(name: string | null, ownerEmail: string | null): boolean {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return true;
  const email = (ownerEmail ?? "").trim().toLowerCase();
  if (!email) return false;
  const local = email.split("@")[0];
  // "admin" for cd.admin@gmail.com too: any piece of the email's start between dots, dashes, plus signs or underscores.
  return n === email || n === local || local.split(/[._+-]/).includes(n);
}

/** The name a report shows as its author: the agency's own name, else the business's, never an email's start. */
export function reportAgencyName(name: string | null, ownerEmail: string | null, businessName: string): string {
  return isPlaceholderAgencyName(name, ownerEmail) ? businessName : name!.trim();
}
