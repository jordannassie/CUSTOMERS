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
