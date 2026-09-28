import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { sitemapEntries } from "@/lib/site-metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("days");
  return sitemapEntries(new Date());
}
