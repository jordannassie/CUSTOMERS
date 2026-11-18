import { sharedPdfUrl } from "@/modules/reports";

// B-59, D-90: a share link opens the report PDF, no login needed. The token is the access check; each visit gets a
// fresh short signed URL (used here on the server only), so a turned-off link stops working at once.
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
  // The PDF is passed through from here, so the client stays on our address: a redirect showed them a long
  // storage-host address instead (BUG-318). The signed URL still never leaves the server.
  let file: Response;
  try {
    file = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    console.error("[reports] share link PDF fetch failed:", error instanceof Error ? error.name : error);
    return text(503, "We couldn't open this report just now. Try again in a minute.");
  }
  if (!file.ok || !file.body) {
    console.error("[reports] share link PDF fetch failed: status", file.status);
    return text(503, "We couldn't open this report just now. Try again in a minute.");
  }
  return new Response(file.body, {
    status: 200,
    headers: {
      ...HEADERS,
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="ai-visibility-report.pdf"',
      ...(file.headers.get("content-length") ? { "Content-Length": file.headers.get("content-length")! } : {}),
    },
  });
}
