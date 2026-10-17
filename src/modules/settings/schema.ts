import { z } from "zod";

// Same values as the check constraints on businesses.models and businesses.scan_frequency.
export const MODEL_IDS = ["openai", "anthropic", "perplexity"] as const;
export const FREQUENCIES = ["daily", "weekly", "monthly"] as const;

export type ModelId = (typeof MODEL_IDS)[number];
export type Frequency = (typeof FREQUENCIES)[number];

const text = (max: number) => z.string().trim().max(max);

// Other names customers and AI use for a business or a competitor (MVP_SPEC 5.5): "KFC", "Book Woman", an old name.
export const ALIASES_MAX = 10;
export const aliasesInput = z.array(text(120).min(2)).max(ALIASES_MAX);

/** A business's neighborhood or area, "East Austin". Same 80 limit as businesses_primary_area_length; empty is null. */
export const AREA_MAX = 80;
export const areaText = z.string().trim().max(AREA_MAX).nullable().transform((area) => area || null);

export const businessProfileInput = z.object({
  businessId: z.uuid(),
  name: text(120).min(1),
  industry: text(80),
  services: z.array(text(60).min(1)).max(20),
  // "Cheezious" for "Cheezious Golra Mor Branch".
  aliases: aliasesInput.optional(),
  city: text(80),
  region: text(80),
  country: text(80).optional(),
  // Left as it is when the form did not send one.
  area: areaText.optional(),
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
