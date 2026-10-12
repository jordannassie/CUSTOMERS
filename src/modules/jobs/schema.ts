import { z } from "zod";

export const businessIdInput = z.object({ businessId: z.uuid() });

/** Run scan: `confirmOverdraft` is set once the user has seen that the scan costs more than their balance (D-54). */
export const startScanInput = businessIdInput.extend({ confirmOverdraft: z.boolean().optional() });
