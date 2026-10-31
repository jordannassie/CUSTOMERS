import "server-only";
import { appUrl } from "@/lib/app-url";

/** The app's own origin for Stripe return URLs: the configured address, never the request's host (BUG-283). */
export async function appOrigin(): Promise<string> {
  return appUrl();
}
