import "server-only";
// The agency logo uploaded in Settings (B-55): where it is stored in our own bucket, read for the report PDF.
import { env } from "@/lib/env";
import { storagePath } from "./service";

export const LOGO_BUCKET = "business-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** The logo's path in our own bucket; null for no logo or a URL anywhere else, which is never fetched. */
export function logoPath(logoUrl: string | null): string | null {
  return logoUrl ? storagePath(logoUrl, env.NEXT_PUBLIC_SUPABASE_URL, LOGO_BUCKET) : null;
}
