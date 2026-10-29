import { sharedPdfUrl } from "@/modules/reports";

// B-59, D-90: a share link opens the report PDF, no login needed. The token is the access check; each visit gets a
// fresh short signed URL, so a turned-off link stops working at once and a copied file URL soon expires.
// Nothing is indexed or cached, and no-referrer keeps the token out of the storage host's logs.
const HEADERS = { "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };

const text = (status: number, body: string) =>
  new Response(`${body}\n`, { status, headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  let url: string | null;
  try {
    url = await sharedPdfUrl((await params).token);
  } catch (error) {
    // Never logs the token: the error messages are written without it.
    console.error("[reports] share link failed:", error instanceof Error ? error.message : error);
    return text(503, "We couldn't open this report just now. Try again in a minute.");
  }
  if (!url) return text(404, "This report is not available. Ask the person who sent it to you for a new link.");
  return new Response(null, { status: 303, headers: { ...HEADERS, Location: url } });
}
