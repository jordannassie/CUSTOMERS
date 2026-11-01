// The app's address at build time (BUG-283). On Netlify, NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL default to the
// site's own address: its primary domain (URL) on the live site, the deploy's address (DEPLOY_PRIME_URL) on previews
// and branch deploys. Netlify sets CONTEXT to production, deploy-preview, branch-deploy or dev; a local build has no
// CONTEXT and keeps the .env values. A live build with no https address fails, so it never ships links to nowhere.
// next.config.ts imports this file before env.ts, so env.ts and the production check there see the filled values; the
// scan worker build (scripts/build-worker.mjs) fills the same values for the same reason.

export const URL_KEYS = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL"] as const;

type Source = Record<string, string | undefined>;
export type BuildUrls = Partial<Record<(typeof URL_KEYS)[number], string>>;

const value = (v: string | undefined) => v?.trim() || undefined;

/** Each URL as set, else the Netlify address. Throws for a live Netlify build without an https address. */
export function buildUrls(source: Source): BuildUrls {
  const netlify = !source.CONTEXT ? undefined : value(source.CONTEXT === "production" ? source.URL : source.DEPLOY_PRIME_URL);
  const urls: BuildUrls = {};
  for (const key of URL_KEYS) {
    const url = value(source[key]) ?? netlify;
    if (url) urls[key] = url;
  }
  if (source.CONTEXT === "production") {
    for (const key of URL_KEYS) {
      if (!urls[key]?.startsWith("https://")) {
        throw new Error(`${key} is ${urls[key] ?? "not set"}. A production build needs the site's https address; set it on Netlify.`);
      }
    }
  }
  return urls;
}

/** Writes the URLs that were not set into `target`, and returns all of them for next.config.ts `env`. */
export function fillBuildUrls(target: Source): BuildUrls {
  const urls = buildUrls(target);
  for (const key of URL_KEYS) if (!value(target[key]) && urls[key]) target[key] = urls[key];
  return urls;
}

// Runs on import, before next.config.ts loads env.ts. Without CONTEXT (local builds, tests) it changes nothing.
// eslint-disable-next-line no-restricted-syntax -- build time only: Netlify's build variables are not app settings.
export const BUILD_URLS = fillBuildUrls(process.env);
