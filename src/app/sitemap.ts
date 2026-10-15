import type { MetadataRoute } from "next";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://customers.direct";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/agency`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/start-ai-business`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/ads`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/apps`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...DIRECTORY_CATALOG.filter((app) => app.active).map((app) => ({
      url: `${base}/apps/${app.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
