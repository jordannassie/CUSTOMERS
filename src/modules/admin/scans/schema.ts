import { z } from "zod";

export const SCAN_STATUSES = ["failed", "running", "queued", "done"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

// An unknown ?status= shows every job rather than an error page.
export const scanFilter = z.enum(SCAN_STATUSES).optional().catch(undefined);

export const retryScanInput = z.object({ jobId: z.uuid() });
