import { z } from "zod";
import { APP_CATEGORIES, isCategoryId, type AppCategoryId } from "./types";

const categoryIds = APP_CATEGORIES.map((category) => category.id) as [AppCategoryId, ...AppCategoryId[]];

export const directorySearchSchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  category: z.string().optional().default("all"),
  sort: z.enum(["name", "provider"]).optional().default("name"),
  page: z.coerce.number().int().min(1).max(200).optional().default(1),
});

export type DirectorySearch = z.infer<typeof directorySearchSchema>;

const httpsUrl = z.string().trim().url().refine((value) => value.startsWith("https://"), "Use an https link.");

export const directoryAppSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  name: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(180),
  websiteUrl: httpsUrl,
  affiliateUrl: z.union([httpsUrl, z.literal("")]).optional().default(""),
  categories: z.array(z.enum(categoryIds)).min(1),
  featured: z.boolean(),
  popular: z.boolean(),
  topPick: z.boolean(),
  active: z.boolean(),
});

export function parseCategoryList(value: string): AppCategoryId[] {
  const ids = value.split(",").map((part) => part.trim()).filter(Boolean);
  return ids.filter(isCategoryId);
}

const OWN_HOSTS = new Set(["customers.direct", "www.customers.direct", "localhost"]);

export function utmFromReferer(referer: string | null): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
} {
  const empty = { utmSource: null, utmMedium: null, utmCampaign: null };
  if (!referer) return empty;
  try {
    const url = new URL(referer);
    if (!OWN_HOSTS.has(url.hostname)) return empty;
    const clip = (key: string) => {
      const value = url.searchParams.get(key)?.trim().slice(0, 80) ?? "";
      return value || null;
    };
    return {
      utmSource: clip("utm_source"),
      utmMedium: clip("utm_medium"),
      utmCampaign: clip("utm_campaign"),
    };
  } catch {
    return empty;
  }
}

export function destinationFor(app: { affiliateUrl: string | null; websiteUrl: string }): {
  url: string;
  kind: "affiliate" | "direct";
} {
  if (app.affiliateUrl && app.affiliateUrl.startsWith("https://")) {
    return { url: app.affiliateUrl, kind: "affiliate" };
  }
  return { url: app.websiteUrl, kind: "direct" };
}
