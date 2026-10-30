import type { NextRequest } from "next/server";
import { requireUser } from "@/modules/auth";
import { fetchSiteIcon, iconQuery } from "@/modules/site-icons";

// A website's icon for the app's lists (Sources, Compare, the leaderboard): GET /api/icon?domain=yelp.com. Signed-in
// users only, so it is not an open relay; Google is the only server it calls. Icons change rarely, so the browser
// keeps one for a week and Netlify's CDN for 30 days; a site with no icon is remembered for a day; a failed ask (the
// network or Google) is never kept, so the next page view asks again.
const KEEP = "public, max-age=604800, stale-while-revalidate=86400";
const KEEP_CDN = "public, max-age=2592000, stale-while-revalidate=86400, durable";
const KEEP_NONE = "public, max-age=86400";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireUser();
  } catch {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const parsed = iconQuery.safeParse({ domain: request.nextUrl.searchParams.get("domain") ?? "" });
  if (!parsed.success) return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });

  const icon = await fetchSiteIcon(parsed.data.domain);
  if (icon.kind === "failed") return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (icon.kind === "none") return new Response(null, { status: 404, headers: { "Cache-Control": KEEP_NONE, "Netlify-CDN-Cache-Control": KEEP_NONE } });
  return new Response(icon.body, {
    headers: {
      "Content-Type": icon.type,
      "Cache-Control": KEEP,
      "Netlify-CDN-Cache-Control": KEEP_CDN,
      "X-Content-Type-Options": "nosniff",
      // An image only: nothing in it may run, even if opened on its own.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
