import { z } from "zod";

export const businessIdInput = z.object({ businessId: z.uuid() });

/**
 * Run scan: `confirmOverdraft` is set once the user has seen that the scan costs more than their balance (D-54), and
 * `confirmRecent` once they chose to scan again within 24 hours of the last scan.
 */
export const startScanInput = businessIdInput.extend({ confirmOverdraft: z.boolean().optional(), confirmRecent: z.boolean().optional() });
