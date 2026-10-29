import "server-only";
import { safeFetch } from "@/lib/net/safe-fetch";
import { failureOf, type SiteFailure } from "./failure";
import { extractSignals, type Signals } from "./signals";
import { isSafePublicUrl, normalizeUrl } from "./url";

export type SiteRead = { signals: Signals; failure: null } | { signals: null; failure: SiteFailure };

/** Reads the public home page only, and says why when it cannot (BUG-096). */
export async function readSite(rawUrl: string): Promise<SiteRead> {
  const url = normalizeUrl(rawUrl);
  if (!isSafePublicUrl(url)) return { signals: null, failure: "unreachable" };
  try {
    const res = await safeFetch(url, { timeoutMs: 9_000 });
    const failure = failureOf(res.status, res.text);
    return failure ? { signals: null, failure } : { signals: extractSignals(res.text), failure: null };
  } catch {
    return { signals: null, failure: "unreachable" };
  }
}
