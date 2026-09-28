import { z } from "zod";
import { FREQUENCIES, MODEL_IDS } from "@/modules/settings";
import { PLAN_IDS } from "./steps";

const text = (max: number) => z.string().trim().max(max);

export const agencyStepInput = z.object({
  name: text(120).min(1),
  // From the pricing page (?plan=); anything else is ignored rather than refused.
  plan: z.enum(PLAN_IDS).nullable().catch(null),
});

export const websiteStepInput = z.union([
  z.object({ domain: text(300).min(1) }),
  // "I don't have a website" (MVP_SPEC 3.3).
  z.object({ name: text(200).min(1), city: text(100).min(1) }),
]);

export const detailsStepInput = z.object({
  businessId: z.uuid(),
  name: text(120).min(1),
  // One of INDUSTRIES, or the user's own words when it is "other".
  industry: text(80).min(1),
  description: text(1000),
  services: z.array(text(60).min(1)).max(20),
  city: text(80).min(1),
  state: text(80),
  country: text(80),
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
});

export type DetailsStepInput = z.infer<typeof detailsStepInput>;
