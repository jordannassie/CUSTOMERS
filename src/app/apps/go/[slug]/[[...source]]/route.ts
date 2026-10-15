import { NextResponse, type NextRequest } from "next/server";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, recordAppClick } from "@/modules/apps-directory/dal";
import { destinationFor, isAllowedReviewUrl, utmFromReferer } from "@/modules/apps-directory/schema";
import { mergeCatalog } from "@/modules/apps-directory/service";
import type { AppSource } from "@/modules/apps-directory/types";

function clickSource(value: string | undefined): AppSource {
  if (value === "homepage" || value === "directory" || value === "detail") return value;
  return "directory";
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string; source?: string[] }> }) {
  const { slug, source } = await context.params;
  const overrides = await listDirectoryOverrides();
  const app = mergeCatalog(DIRECTORY_CATALOG, overrides.apps).find((item) => item.slug === slug && item.active);
  if (!app) return NextResponse.redirect(new URL("/apps", request.url));

  const parts = source ?? [];
  const reviewing = parts[0] === "review";
  const utm = utmFromReferer(request.headers.get("referer"));
  const from = clickSource(reviewing ? parts[1] : parts[0]);

  if (reviewing) {
    if (!isAllowedReviewUrl(app.reviewUrl)) return NextResponse.redirect(new URL(`/apps/${app.slug}`, request.url));
    await recordAppClick({
      slug: app.slug,
      source: from,
      kind: "review",
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
    });
    return NextResponse.redirect(app.reviewUrl);
  }

  const destination = destinationFor(app);
  await recordAppClick({
    slug: app.slug,
    source: from,
    kind: destination.kind,
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
  });

  return NextResponse.redirect(destination.url);
}
