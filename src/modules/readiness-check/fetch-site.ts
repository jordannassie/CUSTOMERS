import "server-only";
import { safeFetch } from "@/lib/net/safe-fetch";
import { extractSignals, type Signals } from "./signals";
import { isSafePublicUrl, normalizeUrl } from "./url";

/** Reads the public home page only; returns null when the site cannot be reached. */
export async function readSite(rawUrl: string): Promise<Signals | null> {
  const url = normalizeUrl(rawUrl);
  if (!isSafePublicUrl(url)) return null;
  try {
    const res = await safeFetch(url, { timeoutMs: 9_000 });
    if (!res.ok || !res.text) return null;
    return extractSignals(res.text);
  } catch {
    return null;
  }
}
