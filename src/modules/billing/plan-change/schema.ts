import { z } from "zod";

// Inputs for the plan change actions. Without previewedAt an action only previews; with it, it applies.
const previewedAt = z.number().int().positive().optional();
const planId = z.string().trim().min(1).max(40);

export const businessPlanInput = z.object({ businessId: z.uuid(), planId, previewedAt });
export const removeBusinessInput = z.object({ businessId: z.uuid(), previewedAt });
export const subscriptionInput = z.object({ previewedAt });
