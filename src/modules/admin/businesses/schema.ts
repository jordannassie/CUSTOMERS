import { z } from "zod";

export const runScanInput = z.object({ businessId: z.uuid() });

export const restoreBusinessInput = z.object({ businessId: z.uuid(), reason: z.string().trim().min(3).max(500) });
