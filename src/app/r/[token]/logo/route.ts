import { getSharedLogo } from "@/modules/reports";

// The agency logo for a share page (B-59). Public like the page itself: the token is the access check.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const logo = await getSharedLogo((await params).token);
  if (!logo) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(logo.bytes, {
    headers: {
      "Content-Type": logo.type,
      // Short and private, so a turned-off link stops showing the logo soon after.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
