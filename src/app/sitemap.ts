import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://customers.direct";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ai-phone`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/customer-acquisition`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/call-bar`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
