import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isCategoryId, type AppCategoryId, type AppSource, type DirectoryApp } from "./types";
import { isMissingTable } from "@/lib/supabase/missing-table";

type AppRow = {
  slug: string;
  name: string;
  provider: string;
  description: string;
  website_url: string;
  affiliate_url: string | null;
  categories: string[];
  featured: boolean;
  popular: boolean;
  top_pick: boolean;
  active: boolean;
};

const missingTable = (error: { code?: string; message?: string } | null) => isMissingTable(error, /directory_apps|directory_clicks/i);

function mapRow(row: AppRow): DirectoryApp | null {
  const categories = row.categories.filter(isCategoryId);
  if (categories.length === 0) return null;
  return {
    slug: row.slug,
    name: row.name,
    provider: row.provider,
    description: row.description,
    websiteUrl: row.website_url,
    affiliateUrl: row.affiliate_url,
    reviewSource: null,
    reviewUrl: null,
    rating: null,
    reviewCount: null,
    ratingScale: 5,
    ratingLastUpdated: null,
    categories,
    featured: row.featured,
    popular: row.popular,
    topPick: row.top_pick,
    active: row.active,
  };
}

export async function listDirectoryOverrides(): Promise<{ apps: DirectoryApp[]; unavailable: boolean }> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.from("directory_apps").select("slug, name, provider, description, website_url, affiliate_url, categories, featured, popular, top_pick, active");
    if (error || !data) {
      if (error && !missingTable(error)) console.error("[apps] list:", error.code, error.message);
      return { apps: [], unavailable: Boolean(error && missingTable(error)) || Boolean(error) };
    }
    return { apps: data.map((row) => mapRow(row as AppRow)).filter((app): app is DirectoryApp => Boolean(app)), unavailable: false };
  } catch (error) {
    console.error("[apps] list:", error instanceof Error ? error.message : "unknown");
    return { apps: [], unavailable: true };
  }
}

export async function saveDirectoryApp(app: DirectoryApp): Promise<{ ok: true } | { ok: false; unavailable: boolean }> {
  const svc = createServiceClient();
  const { error } = await svc.from("directory_apps").upsert({
    slug: app.slug,
    name: app.name,
    provider: app.provider,
    description: app.description,
    website_url: app.websiteUrl,
    affiliate_url: app.affiliateUrl,
    categories: app.categories satisfies AppCategoryId[],
    featured: app.featured,
    popular: app.popular,
    top_pick: app.topPick,
    active: app.active,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[apps] save:", error.code, error.message);
    return { ok: false, unavailable: missingTable(error) };
  }
  return { ok: true };
}

export async function recordAppClick(input: {
  slug: string;
  source: AppSource;
  kind: "affiliate" | "direct" | "review" | "view";
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    const { error } = await svc.from("directory_clicks").insert({
      slug: input.slug,
      source: input.source,
      destination: input.kind,
      utm_source: input.utmSource,
      utm_medium: input.utmMedium,
      utm_campaign: input.utmCampaign,
    });
    if (error && !missingTable(error)) console.error("[apps] click:", error.code, error.message);
  } catch (error) {
    console.error("[apps] click:", error instanceof Error ? error.message : "unknown");
  }
}

export async function listRecentClicks(): Promise<{ clicks: { slug: string; source: string; destination: string; createdAt: string }[]; unavailable: boolean }> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.from("directory_clicks").select("slug, source, destination, created_at").order("created_at", { ascending: false }).limit(20);
    if (error || !data) return { clicks: [], unavailable: true };
    return {
      clicks: data.map((row) => ({
        slug: row.slug,
        source: row.source,
        destination: row.destination,
        createdAt: row.created_at,
      })),
      unavailable: false,
    };
  } catch {
    return { clicks: [], unavailable: true };
  }
}
