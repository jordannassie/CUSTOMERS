import { z } from "zod";
import { needsClearerIndustry, OTHER_LABEL_HINT } from "@/lib/other-label";
import { aliasesInput, areaText, FREQUENCIES, MODEL_IDS } from "@/modules/settings";
import { PLAN_IDS } from "./steps";

const text = (max: number) => z.string().trim().max(max);

export const agencyStepInput = z.object({
  name: text(120).min(1),
  // From the pricing page (?plan=); anything else is ignored rather than refused.
  plan: z.enum(PLAN_IDS).nullable().catch(null),
});

// A plan chosen on the new-business plan picker before starting the wizard (null otherwise, Set up another
// business skips it and keeps auto-matching the agency's other businesses).
const planField = z.enum(PLAN_IDS).nullable().catch(null).optional();

export const websiteStepInput = z.intersection(
  z.union([
    z.object({ domain: text(300).min(1) }),
    // "I don't have a website" (MVP_SPEC 3.3).
    z.object({ name: text(200).min(1), city: text(100).min(1) }),
  ]),
  z.object({
    plan: planField,
    // Made by the browser for each attempt (migration 067): a double submit or a retry finds the same draft.
    createKey: z.uuid().optional(),
    // "Try again" after the website and Google both failed (2026-10-16).
    retry: z.boolean().optional(),
  }),
);

export const detailsStepInput = z.object({
  businessId: z.uuid(),
  name: text(120).min(1),
  // One of INDUSTRIES, or the user's own words when it is "other". A vague label ("Consultant", "Store") is refused,
  // so questions are never written from it (2026-10-16).
  industry: text(80)
    .min(1)
    .refine((industry) => !needsClearerIndustry(industry), OTHER_LABEL_HINT),
  description: text(1000),
  services: z.array(text(60).min(1)).max(20),
  // Other names customers and AI use for it, optional: left as they are when not sent.
  aliases: aliasesInput.optional(),
  city: text(80).min(1),
  state: text(80),
  country: text(80),
  // Neighborhood or area, optional: empty saves null; left as it is when not sent.
  area: areaText.optional(),
  phone: text(30).regex(/^[0-9+().\s-]*$/),
});

export const questionsStepInput = z.object({
  businessId: z.uuid(),
  // The plan limit is checked in the DAL; this only stops absurd payloads.
  questions: z.array(text(300).min(8)).min(1).max(100),
});

export const businessOnly = z.object({ businessId: z.uuid() });

export const modelsStepInput = z.object({
  businessId: z.uuid(),
  models: z
    .array(z.enum(MODEL_IDS))
    .min(1)
    .refine((m) => new Set(m).size === m.length),
  frequency: z.enum(FREQUENCIES),
  /** The plan and price shown for adding this business to the subscription (BUG-071, D-57). */
  addOn: z.object({ planId: z.string().regex(/^[a-z0-9_]{1,64}$/), previewedAt: z.number().int().positive() }).optional(),
});

export type DetailsStepInput = z.infer<typeof detailsStepInput>;
