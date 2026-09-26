# Caching rules (Cache Components, D-80)

`cacheComponents: true` is on in `next.config.ts`. Nothing is cached unless code opts in with `"use cache"`.

## Rule of thumb

- **Marketing pages are cached.** Home, pricing, agency, compare, contact, legal pages, `sitemap.xml` and `robots.txt` are prerendered as static HTML. If a marketing page needs server data that is the same for every visitor, fetch it in a function with `"use cache"` and a `cacheLife` profile.
- **Dashboard and admin are dynamic.** Anything behind login reads the session (`cookies()`), so it renders per request and streams in behind a `<Suspense>` boundary (`src/app/dashboard/loading.tsx`, the admin layout).
- **Never put `"use cache"` on logged-in data.** A cached result is shared by every visitor, so one user could see another user's data. This includes any function that takes a user, agency or business id.

## When the build complains

`next build` stops on "uncached or runtime data during prerendering". Fix it in this order:

1. Runtime reads (`cookies()`, `headers()`, `searchParams`, `params`, Supabase calls with the user's session): move them into a component inside `<Suspense>`, or under a `loading.tsx`.
2. Shared public data (same for every visitor): `"use cache"` plus `cacheLife`.
3. `new Date()`, `Math.random()`: call `connection()` first inside `<Suspense>`, or put it in a `"use cache"` function if one value for everyone is fine.

Route segment configs (`dynamic`, `revalidate`, `fetchCache`) are not allowed with Cache Components; do not add them back.

Docs: `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` and `02-guides/migrating-to-cache-components.md`.
