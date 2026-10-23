import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { SITE_URL, sitemapEntries } from "@/lib/site-metadata";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("days");
  const now = new Date();
  // Each active app in the AI apps directory has its own page (merged from main).
  const apps = DIRECTORY_CATALOG.filter((app) => app.active).map((app) => ({
    url: `${SITE_URL}/apps/${app.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...sitemapEntries(now), ...apps];
}
