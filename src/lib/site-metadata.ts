import type { Metadata, MetadataRoute } from "next";

export const SITE_URL = "https://customers.direct";
export const SITE_NAME = "Customers.Direct";

// The kept public pages (MVP_SPEC 12); the sitemap lists exactly these.
export const PUBLIC_PAGES: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/agency", changeFrequency: "monthly", priority: 0.8 },
  { path: "/compare", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

// App, onboarding, admin, share pages (/r/<token>) and API. The trailing slash on /r/ keeps /reset-password crawlable.
export const PRIVATE_PATHS = [
  "/dashboard",
  "/sources",
  "/competitors",
  "/questions",
  "/opportunities",
  "/settings",
  "/onboarding",
  "/internal",
  "/design-preview",
  "/account-paused",
  "/account-deleted",
  "/r/",
  "/api/",
  "/auth/",
];

export function sitemapEntries(lastModified: Date): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

// A page that sets its own openGraph replaces the root one, image included, so each page names the image again.
const PREVIEW_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Customers.Direct: see if ChatGPT, Claude and Perplexity recommend your business",
};

// Page title, description, canonical URL and link preview text in one place, so no page falls back to the homepage's.
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, url: path, title: fullTitle, description, images: [PREVIEW_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [PREVIEW_IMAGE] },
  };
}
