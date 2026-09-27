export function normalizeUrl(input: string): string {
  const s = input.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function extractDomain(raw: string): string {
  try {
    return new URL(normalizeUrl(raw)).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

const PRIVATE_HOST = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0$)/;

/** Blocks non-web and private addresses so the check cannot be pointed at internal services. */
export function isSafePublicUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(normalizeUrl(raw));
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const h = parsed.hostname.toLowerCase();
  if (!h.includes(".") || h.startsWith("[")) return false;
  if (h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return false;
  return !PRIVATE_HOST.test(h);
}
