import { ownSiteIcon } from "./own-site";

// Website icons (favicons) for the lists of sites and businesses, by the site's address: Google's favicon service and
// DuckDuckGo's together, then the icon the site declares itself (many local businesses are known to neither). Nothing
// is uploaded or stored. Every failure means "no icon now" and the screen shows the site's first letter instead.

const GOOGLE = (host: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
const DUCKDUCKGO = (host: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;
const TIMEOUT_MS = 4000;
// Favicons are a few KB; DuckDuckGo sends the site's whole .ico, which can hold several sizes.
const MAX_BYTES = 100 * 1024;

/**
 * "icon": the image. "none": both services said they have none and the site declares none, worth remembering for a
 * while. "failed": a service could not be reached this time (dropped connection, timeout, rate limit), so nothing is
 * remembered and the next page view asks again: a slow answer must never hide an icon that exists for a day.
 */
export type SiteIconResult = { kind: "icon"; body: ArrayBuffer; type: string } | { kind: "none" } | { kind: "failed" };
type Asked = { kind: "icon"; body: ArrayBuffer; type: string } | { kind: "none" } | { kind: "failed" };

/** One favicon service. Both answer 404 (with a stock image) for a site they have no icon for. */
async function ask(url: string, fetchImpl: typeof fetch): Promise<Asked> {
  try {
    const res = await fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    const type = res.headers.get("content-type") ?? "";
    if (res.status === 404) return { kind: "none" };
    if (!res.ok || !type.startsWith("image/")) return { kind: "failed" };
    const body = await res.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return { kind: "none" };
    return { kind: "icon", body, type };
  } catch {
    return { kind: "failed" };
  }
}

export async function fetchSiteIcon(
  host: string,
  fetchImpl: typeof fetch = fetch,
  ownSite: (host: string) => Promise<{ body: ArrayBuffer; type: string } | "none" | "failed"> = ownSiteIcon,
): Promise<SiteIconResult> {
  const [google, duck] = await Promise.all([ask(GOOGLE(host), fetchImpl), ask(DUCKDUCKGO(host), fetchImpl)]);
  if (google.kind === "icon") return google;
  if (duck.kind === "icon") return duck;
  const own = await ownSite(host).catch(() => "failed" as const);
  if (typeof own === "object") return { kind: "icon", ...own };
  return google.kind === "none" && duck.kind === "none" && own === "none" ? { kind: "none" } : { kind: "failed" };
}
