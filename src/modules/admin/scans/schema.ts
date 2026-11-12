import { z } from "zod";

export const SCAN_STATUSES = ["failed", "skipped", "running", "queued", "done"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

// An unknown ?status= shows every job rather than an error page.
export const scanFilter = z.enum(SCAN_STATUSES).optional().catch(undefined);

export const retryScanInput = z.object({ jobId: z.uuid() });

// The Scans filters in the URL (admin review 2026-11-12): dates as YYYY-MM-DD (UTC), one agency, and real, test or
// every agency. A value that does not parse is no filter, never an error page.
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)));
export const SCAN_TEST_FILTERS = ["all", "real", "test"] as const;
export type ScanTestFilter = (typeof SCAN_TEST_FILTERS)[number];

export const scanListQuery = z.object({
  status: scanFilter,
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
  agency: z.uuid().optional().catch(undefined),
  business: z.uuid().optional().catch(undefined),
  // No longer offered on the page (2026-11-12: real and test made no sense to admins); old links still parse.
  test: z.enum(SCAN_TEST_FILTERS).catch("all"),
});
export type ScanListQuery = z.infer<typeof scanListQuery>;
