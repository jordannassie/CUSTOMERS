import { NextResponse, type NextRequest } from "next/server";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, recordAppClick } from "@/modules/apps-directory/dal";
import { destinationFor, utmFromReferer } from "@/modules/apps-directory/schema";
import { mergeCatalog } from "@/modules/apps-directory/service";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string; source?: string[] }> }) {
  const { slug, source } = await context.params;
  const overrides = await listDirectoryOverrides();
  const app = mergeCatalog(DIRECTORY_CATALOG, overrides.apps).find((item) => item.slug === slug && item.active);
  if (!app) return NextResponse.redirect(new URL("/apps", request.url));

  const clickSource = source?.[0] === "homepage" ? "homepage" : "directory";
  const utm = utmFromReferer(request.headers.get("referer"));
  const destination = destinationFor(app);
  await recordAppClick({
    slug: app.slug,
    source: clickSource,
    kind: destination.kind,
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
  });

  return NextResponse.redirect(destination.url);
}
