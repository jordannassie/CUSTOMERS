import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://customers.direct";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ai-search`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ai-employee`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/dm-ads`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/call-bar`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
