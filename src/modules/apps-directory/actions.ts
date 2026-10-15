"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require";
import { saveDirectoryApp } from "./dal";
import { directoryAppSchema, parseCategoryList } from "./schema";

export async function saveDirectoryAppAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = directoryAppSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    provider: formData.get("provider"),
    description: formData.get("description"),
    websiteUrl: formData.get("websiteUrl"),
    affiliateUrl: formData.get("affiliateUrl") ?? "",
    categories: parseCategoryList(String(formData.get("categories") ?? "")),
    featured: formData.get("featured") === "on",
    popular: formData.get("popular") === "on",
    topPick: formData.get("topPick") === "on",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: "Check the slug, https links, and at least one category id." };
  const saved = await saveDirectoryApp({
    ...parsed.data,
    affiliateUrl: parsed.data.affiliateUrl ? parsed.data.affiliateUrl : null,
  });
  if (!saved.ok) {
    return { error: saved.unavailable ? "Apply migration 025 before saving directory apps." : "Could not save that app." };
  }
  revalidatePath("/apps");
  revalidatePath("/internal/admin/apps");
  return {};
}
