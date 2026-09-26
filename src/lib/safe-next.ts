const FALLBACK = "/dashboard";

// Only same-site paths: "//host" and "/\host" are treated by browsers as other sites.
export function safeNextPath(next: string | null | undefined, fallback = FALLBACK): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

export function loginPathFor(next: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}
