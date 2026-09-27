import "server-only";
import { extractSignals, type Signals } from "./signals";
import { isSafePublicUrl, normalizeUrl } from "./url";

/** Reads the public home page only; returns null when the site cannot be reached. */
export async function readSite(rawUrl: string): Promise<Signals | null> {
  const url = normalizeUrl(rawUrl);
  if (!isSafePublicUrl(url)) return null;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(9_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CustomersDirectScanner/1.0; +https://customers.direct)" },
    });
    if (!res.ok || (res.url && !isSafePublicUrl(res.url))) return null;
    const html = await res.text();
    return html ? extractSignals(html) : null;
  } catch {
    return null;
  }
}
