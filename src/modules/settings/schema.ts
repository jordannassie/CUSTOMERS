import { z } from "zod";

// Same values as the check constraints on businesses.models and businesses.scan_frequency.
export const MODEL_IDS = ["openai", "anthropic", "perplexity"] as const;
export const FREQUENCIES = ["daily", "weekly", "monthly"] as const;

export type ModelId = (typeof MODEL_IDS)[number];
export type Frequency = (typeof FREQUENCIES)[number];

const text = (max: number) => z.string().trim().max(max);

export const businessProfileInput = z.object({
  businessId: z.uuid(),
  name: text(120).min(1),
  industry: text(80),
  services: z.array(text(60).min(1)).max(20),
  city: text(80),
  region: text(80),
  phone: text(30).regex(/^[0-9+().\s-]*$/),
  website: text(253),
});

export const scanSettingsInput = z.object({
  businessId: z.uuid(),
  models: z
    .array(z.enum(MODEL_IDS))
    .min(1)
    .refine((models) => new Set(models).size === models.length),
  frequency: z.enum(FREQUENCIES),
});

export const agencyNameInput = z.object({ name: text(120).min(1) });

export type BusinessProfileInput = z.infer<typeof businessProfileInput>;
export type ScanSettingsInput = z.infer<typeof scanSettingsInput>;
export type AgencyNameInput = z.infer<typeof agencyNameInput>;
