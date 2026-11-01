import type { NextRequest } from "next/server";
import { requireUser } from "@/modules/auth";
import { checkRateLimit } from "@/modules/rate-limit";
import { fetchSiteIcon, iconQuery } from "@/modules/site-icons";

// A website's icon for the app's lists (Sources, Compare, the leaderboard): GET /api/icon?domain=yelp.com. Signed-in
// users only. It asks Google's and DuckDuckGo's favicon services, then the site's own home page and the icons it
// declares (which may sit on another host, such as a site builder's CDN), all through safeFetch so only public
// addresses are reached. Icons change rarely, so the browser keeps one for a week and a site with no icon for a day;
// a failed ask is never kept, so the next page view asks again. Only the user's browser keeps them ("private"): a
// shared CDN copy would hand any site's image, under our domain, to people who are not signed in.
const KEEP = "private, max-age=604800, stale-while-revalidate=86400";
const KEEP_NONE = "private, max-age=86400";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch {
    return new Response(null, { status: 401, headers: NO_STORE });
  }
  const parsed = iconQuery.safeParse({ domain: request.nextUrl.searchParams.get("domain") ?? "" });
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });
  // Each icon can mean several outside requests, so a user gets a generous hourly allowance, not an open relay.
  const limit = await checkRateLimit("site_icon", userId);
  if (limit !== "allowed") return new Response(null, { status: 429, headers: NO_STORE });

  const icon = await fetchSiteIcon(parsed.data.domain);
  // A failed ask is a 204, not a 503: the image falls back to the letter all the same, without a "Failed to load
  // resource" error in the browser console for every unreachable site (mockup-ui shows icons on every page).
  if (icon.kind === "failed") return new Response(null, { status: 204, headers: NO_STORE });
  if (icon.kind === "none") return new Response(null, { status: 404, headers: { "Cache-Control": KEEP_NONE } });
  return new Response(icon.body, {
    headers: {
      "Content-Type": icon.type,
      "Cache-Control": KEEP,
      "X-Content-Type-Options": "nosniff",
      // An image only: nothing in it may run, even if opened on its own.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
