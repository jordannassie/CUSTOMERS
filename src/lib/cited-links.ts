// ChatGPT writes each business it names as a Google Maps search link ("google.com/maps/search/787+Coffee,+New+York")
// and tags it as a citation. That is a link the AI built, not a page it read, so counting it made Google look like
// the main source of every ChatGPT answer (preview audit, 2026-11-12). A Maps place page stays a source. Pure.

const GOOGLE_HOST = /^(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/;

/** True for a Google search or Maps search link the AI made up from a name, never for a real page. */
export function isMapSearchLink(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (!GOOGLE_HOST.test(host)) return false;
  const path = parsed.pathname.toLowerCase();
  if (path.startsWith("/maps/search") || path === "/search" || path.startsWith("/search/")) return true;
  const asks = parsed.searchParams.has("q") || parsed.searchParams.has("query");
  return asks && (path === "/" || path === "/maps" || path === "/maps/");
}

/** The cited links without the ones the AI built itself. Anything that is not a list is returned as it was. */
export function realCitations<T>(value: T): T {
  if (!Array.isArray(value)) return value;
  return value.filter((c) => {
    const url = c && typeof c === "object" ? (c as { url?: unknown }).url : undefined;
    return typeof url !== "string" || !isMapSearchLink(url);
  }) as T;
}
