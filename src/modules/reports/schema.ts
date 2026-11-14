import { z } from "zod";

/** No report id, or null, is the current report. */
const reportId = z.uuid().nullish().transform((id) => id ?? null);

export const createShareLinkInput = z.object({ businessId: z.uuid(), reportId });

export const revokeShareLinkInput = z.object({ id: z.uuid() });

export const exportPdfInput = z.object({ businessId: z.uuid(), reportId });

export const saveSnapshotInput = z.object({ businessId: z.uuid() });

export const deleteSnapshotInput = z.object({ businessId: z.uuid(), reportId: z.uuid() });

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v);

/** The agency's report branding (agencies.report_branding, D-90); a blank field clears it. */
export const reportBrandingInput = z.object({
  accent: z.preprocess(blankToNull, z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a colour like #1F4FD1.").nullable()),
  contactEmail: z.preprocess(blankToNull, z.email("Enter an email address like you@agency.com.").max(200).nullable()),
  bookingUrl: z.preprocess(
    blankToNull,
    z.url({ protocol: /^https$/, error: "Enter a link that starts with https://." }).max(500).nullable(),
  ),
});
export type ReportBrandingInput = z.infer<typeof reportBrandingInput>;

/** The ?report= search param of the Reports page; anything else is the current report. */
export const reportParam = z.uuid().catch("").transform((id) => id || null);
