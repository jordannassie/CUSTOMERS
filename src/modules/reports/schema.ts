import { z } from "zod";
import { SECTIONS } from "./sections";

/** No report id, or null, is the live report. */
const reportId = z.uuid().nullish().transform((id) => id ?? null);

export const createShareLinkInput = z.object({ businessId: z.uuid(), reportId });

export const revokeShareLinkInput = z.object({ id: z.uuid() });

export const exportPdfInput = z.object({ businessId: z.uuid(), reportId });

export const saveSnapshotInput = z.object({ businessId: z.uuid() });

export const deleteSnapshotInput = z.object({ businessId: z.uuid(), reportId: z.uuid() });

export const saveReportSectionsInput = z.object({
  businessId: z.uuid(),
  // At least one section stays on, so a report is never an empty page.
  hidden: z
    .array(z.enum(SECTIONS))
    .max(SECTIONS.length - 1)
    .transform((list) => SECTIONS.filter((s) => list.includes(s))),
});

/** The ?report= search param of the Reports page; anything else is the live report. */
export const reportParam = z.uuid().catch("").transform((id) => id || null);
