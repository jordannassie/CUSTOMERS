import { z } from "zod";

// Inputs of the contact form, the feature request widget and their admin screens (2026-10-14: these routes validated
// by hand and wrote to the database inline).

export const CONTACT_TOPICS = ["ai_visibility", "agency", "book_demo", "other", "product", "support", "sales", "enterprise"] as const;
export const CONTACT_SOURCES = ["contact_page", "chat", "agency", "other"] as const;
export const LEAD_STATUSES = ["new", "contacted", "qualified", "closed", "in_progress", "resolved"] as const;
export const FEATURE_STATUSES = ["new", "reviewing", "planned", "shipped", "declined"] as const;

const text = (max: number) => z.string().trim().max(max);
/** Optional text, cut to `max` rather than refused, as the form always did. */
const cut = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, max) : ""), z.string()).transform((v) => v || null);

export const contactInput = z.object({
  name: z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, 200) : ""), z.string()),
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 254) : ""), z.string()),
  company: cut(200),
  website: cut(500),
  phone: cut(30),
  message: z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, 5000) : ""), z.string()),
  page_path: cut(500),
  // `interest` is the field's new name, `topic` the old one; anything else is "other".
  interest: z.unknown().optional(),
  topic: z.unknown().optional(),
  source: z.enum(CONTACT_SOURCES).catch("other"),
  _honey: z.unknown().optional(),
});
export type ContactInput = z.infer<typeof contactInput>;

export const featureRequestInput = z.object({
  title: z.preprocess((v) => (typeof v === "string" ? v : ""), text(10_000)),
  description: z.preprocess((v) => (typeof v === "string" ? v : ""), text(10_000)),
  businessId: z.uuid().optional().catch(undefined),
  pageContext: z.preprocess((v) => (typeof v === "string" ? v.slice(0, 200) : ""), z.string()).transform((v) => v || null),
});
export type FeatureRequestInput = z.infer<typeof featureRequestInput>;
export const FEATURE_TITLE_MAX = 200;
export const FEATURE_DESCRIPTION_MAX = 2000;

export const featureStatusInput = z.object({ id: z.uuid(), status: z.enum(FEATURE_STATUSES) });

export const leadsQuery = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: text(200).catch(""),
  interest: text(40).catch(""),
  source: text(40).catch(""),
  status: text(40).catch(""),
  unread: z.literal("1").optional().catch(undefined),
  count: z.literal("1").optional().catch(undefined),
});

export const leadUpdateInput = z.object({
  id: z.uuid(),
  status: z.enum(LEAD_STATUSES).optional().catch(undefined),
  mark_read: z.literal(true).optional().catch(undefined),
  mark_unread: z.literal(true).optional().catch(undefined),
});
