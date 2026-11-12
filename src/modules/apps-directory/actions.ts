"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth";
import { deleteDirectoryApp, saveDirectoryApp } from "./dal";
import { directoryAppSchema, directorySlugSchema, parseCategoryList } from "./schema";

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
    reviewSource: null,
    reviewUrl: null,
    rating: null,
    reviewCount: null,
    ratingScale: 5,
    ratingLastUpdated: null,
  });
  if (!saved.ok) {
    return { error: saved.unavailable ? "Apply migration 072 before saving directory apps." : "Could not save that app." };
  }
  revalidatePath("/apps");
  revalidatePath("/internal/admin/apps");
  return {};
}

/** Removes an app's saved version (admin audit 2026-11-12): a built-in app goes back to the built-in values. */
export async function removeDirectoryAppAction(slug: string): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = directorySlugSchema.safeParse(slug);
  if (!parsed.success) return { error: "Pick an app first." };
  const removed = await deleteDirectoryApp(parsed.data);
  if (!removed.ok) {
    return { error: removed.unavailable ? "Apply migration 072 before changing directory apps." : "Could not remove that change. Try again." };
  }
  revalidatePath("/apps");
  revalidatePath(`/apps/${parsed.data}`);
  revalidatePath("/internal/admin/apps");
  return {};
}
