import { z } from "zod";

// Every agency action names the agency and says why (MVP_SPEC 9.1); the reason goes into the audit log.
const base = z.object({
  agencyId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
});

export const MAX_CREDIT_CHANGE = 100_000;
export const MAX_TRIAL_DAYS = 30;

export const adjustCreditsInput = base.extend({
  // Negative removes credits. Zero changes nothing, so it is refused.
  delta: z.number().int().min(-MAX_CREDIT_CHANGE).max(MAX_CREDIT_CHANGE).refine((n) => n !== 0),
  // Made once per form submit, so a double click applies once (D-55).
  requestId: z.uuid(),
});

export const extendTrialInput = base.extend({
  days: z.number().int().min(1).max(MAX_TRIAL_DAYS),
});

export const reasonInput = base;

export const markTestInput = base.extend({ isTest: z.boolean() });

export const AGENCY_FILTERS = ["trialing", "active", "past_due", "canceled", "suspended", "deleted", "test"] as const;
export type AgencyFilter = (typeof AGENCY_FILTERS)[number];

// An unknown ?status= shows every agency rather than an error page.
export const agencyFilter = z.enum(AGENCY_FILTERS).optional().catch(undefined);
