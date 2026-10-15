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

export function destinationFor(app: { affiliateUrl: string | null; websiteUrl: string }): {
  url: string;
  kind: "affiliate" | "direct";
} {
  if (app.affiliateUrl && app.affiliateUrl.startsWith("https://")) {
    return { url: app.affiliateUrl, kind: "affiliate" };
  }
  return { url: app.websiteUrl, kind: "direct" };
}
