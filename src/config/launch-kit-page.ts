import "server-only";
import { env } from "@/lib/env";

/**
 * Optional hard-coded Bundle or Stripe Payment Link.
 * Prefer NEXT_PUBLIC_LAUNCH_KIT_PAYMENT_LINK in Netlify / .env.local.
 * Paste a full https:// URL here only if you are not using the env var.
 */
export const LAUNCH_KIT_BUNDLE_URL = "PASTE_MY_BUNDLE_PAGE_URL_HERE";

export function getLaunchKitPaymentUrl(): string | null {
  const fromEnv = env.NEXT_PUBLIC_LAUNCH_KIT_PAYMENT_LINK;
  if (fromEnv) return fromEnv;
  if (LAUNCH_KIT_BUNDLE_URL.startsWith("https://") || LAUNCH_KIT_BUNDLE_URL.startsWith("http://")) {
    return LAUNCH_KIT_BUNDLE_URL;
  }
  return null;
}
