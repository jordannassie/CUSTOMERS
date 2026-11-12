import { z } from "zod";

// It spends the agency's credits, so it asks why, like every other admin change (admin review 2026-11-12).
export const runScanInput = z.object({ businessId: z.uuid(), reason: z.string().trim().min(3).max(500) });

export const restoreBusinessInput = z.object({ businessId: z.uuid(), reason: z.string().trim().min(3).max(500) });

// Businesses list tabs (admin review 2026-11-12). An unknown ?filter= shows every business.
export const BUSINESS_FILTERS = ["all", "live", "setup", "deleted", "test"] as const;
export type BusinessFilter = (typeof BUSINESS_FILTERS)[number];
export const businessFilter = z.enum(BUSINESS_FILTERS).catch("all");
