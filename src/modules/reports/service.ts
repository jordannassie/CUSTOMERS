import { randomBytes } from "node:crypto";

// Share links (B-59, MVP_SPEC 8.3, D-12, D-90). Pure apart from the token source.

/** 32 random bytes as base64url: 43 characters, never guessable (MVP_SPEC 8.3). */
export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

// Anything else cannot be one of our tokens, so it never reaches the database.
export const SHARE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export const isShareToken = (token: string): boolean => SHARE_TOKEN.test(token);

export const sharePath = (token: string): string => `/r/${token}`;

// Before D-90 a PDF export made its own short link (for_pdf) to print. Any such link left on stops opening after this.
export const PDF_LINK_MAX_AGE_MS = 5 * 60_000;

/** False for an old PDF export link older than PDF_LINK_MAX_AGE_MS; an agency's own links never expire. */
export function shareLinkOpens(share: { for_pdf: boolean; created_at: string }, now: Date): boolean {
  if (!share.for_pdf) return true;
  const age = now.getTime() - Date.parse(share.created_at);
  return Number.isFinite(age) && age < PDF_LINK_MAX_AGE_MS;
}

/** The storage path of a logo uploaded to our own bucket; null for any other URL. */
export function storagePath(logoUrl: string, supabaseUrl: string, bucket: string): string | null {
  let url: URL;
  try {
    url = new URL(logoUrl);
  } catch {
    return null;
  }
  const prefix = `/storage/v1/object/public/${bucket}/`;
  if (url.origin !== new URL(supabaseUrl).origin || !url.pathname.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.pathname.slice(prefix.length));
  return path && !path.split("/").includes("..") ? path : null;
}
