import { NextResponse, type NextRequest } from "next/server";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, recordAppClick } from "@/modules/apps-directory/dal";
import { destinationFor } from "@/modules/apps-directory/schema";
import { mergeCatalog } from "@/modules/apps-directory/service";

function clip(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 80);
  return trimmed || null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const overrides = await listDirectoryOverrides();
  const app = mergeCatalog(DIRECTORY_CATALOG, overrides.apps).find((item) => item.slug === slug && item.active);
  if (!app) return NextResponse.redirect(new URL("/apps", request.url));

  const source = request.nextUrl.searchParams.get("source") === "homepage" ? "homepage" : "directory";
  const destination = destinationFor(app);
  await recordAppClick({
    slug: app.slug,
    source,
    kind: destination.kind,
    utmSource: clip(request.nextUrl.searchParams.get("utm_source")),
    utmMedium: clip(request.nextUrl.searchParams.get("utm_medium")),
    utmCampaign: clip(request.nextUrl.searchParams.get("utm_campaign")),
  });

  return NextResponse.redirect(destination.url);
}
