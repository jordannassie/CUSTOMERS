import { z } from "zod";

// Inputs for the plan change actions. Without previewedAt an action only previews; with it, it applies.
const previewedAt = z.number().int().positive().optional();
const planId = z.string().trim().min(1).max(40);

/** Why the owner is leaving, picked in the "Before you cancel" dialog; optional (migration 062). */
export const CANCEL_REASONS = ["too_expensive", "not_useful", "just_testing", "other"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
const reason = z.enum(CANCEL_REASONS).optional();

export const businessPlanInput = z.object({ businessId: z.uuid(), planId, previewedAt });
export const removeBusinessInput = z.object({ businessId: z.uuid(), previewedAt, reason });
export const keepBusinessInput = z.object({ businessId: z.uuid(), previewedAt });
export const subscriptionInput = z.object({ previewedAt });
export const cancelInput = z.object({ previewedAt, reason });
