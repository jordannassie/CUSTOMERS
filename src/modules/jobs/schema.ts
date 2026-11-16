import { z } from "zod";

export const businessIdInput = z.object({ businessId: z.uuid() });

/** Run scan: `confirmRecent` once the user chose to scan again within 20 hours of the last scan. */
export const startScanInput = businessIdInput.extend({ confirmRecent: z.boolean().optional() });
