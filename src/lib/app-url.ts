import { env } from "./env";

// The app's own address for links in emails, login and signup redirects and Stripe return pages (BUG-283). It comes
// only from NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL, which a production build always has (env.ts, build-urls.ts),
// and never from request headers, which a proxy or a preview host can change. Safe in client code: it reads only
// NEXT_PUBLIC_ values and NODE_ENV, which Next inlines in the browser.

const trimmed = (url: string) => url.replace(/\/+$/, "");

/** Development only: this dev server's own address, so a session on another port comes back to itself. */
function devOrigin(): string | null {
  if (typeof window !== "undefined") return window.location.origin;
  return env.PORT ? `http://localhost:${env.PORT}` : null;
}

/**
 * The app's address with no trailing slash. In production it is NEXT_PUBLIC_APP_URL, else NEXT_PUBLIC_SITE_URL. In
 * development and tests NEXT_PUBLIC_APP_URL still wins, then the dev server's own address, then NEXT_PUBLIC_SITE_URL.
 */
export function appUrl(): string {
  const configured = env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_SITE_URL;
  const url = env.NODE_ENV === "production" ? configured : (env.NEXT_PUBLIC_APP_URL ?? devOrigin() ?? configured);
  if (!url) throw new Error("Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL to the app's address, so links point to it.");
  return trimmed(url);
}
