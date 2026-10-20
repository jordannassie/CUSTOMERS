import { z } from "zod";

const optionalText = z.string().trim().max(80).optional().default("");

export const reviewDraftSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(4).max(120),
  useCase: z.string().trim().min(8).max(600),
  pros: z.string().trim().min(8).max(800),
  cons: z.string().trim().min(8).max(800),
  recommendation: z.enum(["yes", "no"]),
  company: optionalText,
  industry: optionalText,
  role: optionalText,
  experienced: z.literal("yes"),
});

export const reportSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(["spam", "duplicate", "not_a_customer", "offensive", "other"]),
  details: z.string().trim().max(500).optional().default(""),
});

export const voteSchema = z.object({
  reviewId: z.string().uuid(),
  helpful: z.enum(["yes", "no"]),
});

export const moderationSchema = z.object({
  reviewId: z.string().uuid(),
  decision: z.enum(["approve", "reject", "remove"]),
  note: z.string().trim().max(500).optional().default(""),
});

export function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
