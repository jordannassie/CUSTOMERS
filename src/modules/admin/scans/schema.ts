import { z } from "zod";

export const SCAN_STATUSES = ["failed", "skipped", "running", "queued", "done"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

// An unknown ?status= shows every job rather than an error page.
export const scanFilter = z.enum(SCAN_STATUSES).optional().catch(undefined);

export const retryScanInput = z.object({ jobId: z.uuid() });

// The Scans filters in the URL (admin review 2026-11-12): dates as YYYY-MM-DD (UTC), one agency, and real, test or
// every agency. A value that does not parse is no filter, never an error page.
// A real calendar day only: "2026-02-30" rolls over to March in Date, so the day must read back the same.
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
  });
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
})
  // A range typed back to front ("Nov 10 to Oct 1") showed no scans at all; it means the same days the right way round.
  .transform((q) => (q.from && q.to && q.from > q.to ? { ...q, from: q.to, to: q.from } : q));
export type ScanListQuery = z.infer<typeof scanListQuery>;
