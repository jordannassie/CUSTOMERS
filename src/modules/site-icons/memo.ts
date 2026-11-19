// Icons already fetched, kept in this server instance's memory (perf plan #6, 2026-11-13). Each icon could mean up to
// three outside requests (Google, DuckDuckGo, the site itself) taking 0.4 to 4 s, repeated for every user and every
// new browser. A kept icon skips them and the rate-limit read; the route still requires a signed-in user and still
// answers with a private, browser-only copy. Failed asks are never kept, so the next view asks again. Pure.
import type { SiteIconResult } from "./service";

type Kept = Exclude<SiteIconResult, { kind: "failed" }>;

export const MEMO_MAX = 500;
export const MEMO_ICON_MS = 7 * 86_400_000;
export const MEMO_NONE_MS = 86_400_000;
/** Real favicons are a few KB; anything far bigger is not worth holding in memory. */
export const MEMO_MAX_BYTES = 64 * 1024;

const kept = new Map<string, { result: Kept; until: number }>();

/** The icon kept for this host, or null when there is none or it is too old. Refreshes its place as most recent. */
export function keptIcon(host: string, now = Date.now()): Kept | null {
  const entry = kept.get(host);
  if (!entry) return null;
  kept.delete(host);
  if (entry.until <= now) return null;
  kept.set(host, entry);
  return entry.result;
}

/** Keeps an icon, or the fact that the site has none; drops the least recently used entry past MEMO_MAX. */
export function keepIcon(host: string, result: SiteIconResult, now = Date.now()): void {
  if (result.kind === "failed") return;
  if (result.kind === "icon" && result.body.byteLength > MEMO_MAX_BYTES) return;
  kept.delete(host);
  kept.set(host, { result, until: now + (result.kind === "icon" ? MEMO_ICON_MS : MEMO_NONE_MS) });
  while (kept.size > MEMO_MAX) kept.delete(kept.keys().next().value!);
}

/** Tests only. */
export function clearKeptIcons(): void {
  kept.clear();
}
