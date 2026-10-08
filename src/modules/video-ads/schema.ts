import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { VIDEO_AD_PACKAGE_IDS } from "./packages";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const packageIdSchema = z.enum(VIDEO_AD_PACKAGE_IDS);

export const checkoutSessionIdSchema = z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/);

export const briefTokenSchema = z.string().regex(/^[a-f0-9]{32}$/);

export const briefSchema = z.object({
  sessionId: checkoutSessionIdSchema,
  token: briefTokenSchema,
  customerName: z.string().trim().min(2).max(200),
  email: z.string().trim().toLowerCase().max(254).regex(EMAIL, "Enter a valid email."),
  businessName: z.string().trim().min(2).max(200),
  websiteUrl: z.string().trim().min(4).max(500),
  product: z.string().trim().min(2).max(300),
  audience: z.string().trim().min(2).max(500),
  creativeInstructions: z.string().trim().min(10).max(2000),
  assetUrl: z.string().trim().max(500).optional(),
  _honey: z.string().optional(),
});

export type VideoAdBriefInput = z.infer<typeof briefSchema>;

export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function briefTokensMatch(expected: string | null, provided: string) {
  if (!expected || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
