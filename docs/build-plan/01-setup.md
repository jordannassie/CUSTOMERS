# Phase 1: Safety and setup

Goal: a clean, safe repo with all the tooling and rules in place before feature work starts. [Back to index](./README.md)

Already done before this phase: malware and secret scanners, git hooks, `predev` and `prebuild` scans, and the Security and CI workflows (PR #4, 2026-09-26, D-82).

---

### B-01 Replace all keys and secure machines
- [ ] Done

Phase 1 · S · Depends on: nothing · Blocked by Jordan: partly (keys in accounts only he controls) · MVP_ROADMAP SEC-01 · Branch: no branch (account and key work, no code)

**Build**
1. Make a list of every secret in `.env.local` and in the Netlify environment: Supabase anon and service role keys, Stripe keys and webhook secret, OpenAI, Google Places, DataForSEO, Resend, `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `GEO_CRON_SECRET`, plus GitHub tokens and SSH keys on any machine that ran the app since 2026-08-31.
2. Rotate each one in its provider dashboard. Supabase: rotate the JWT secret and service role key.
3. Create the new accounts or keys the MVP needs: Anthropic, Perplexity, Firecrawl, Browserless, and a Stripe sandbox (D-39).
4. Store all keys in a shared password manager. Update `.env.local` on each developer machine. Add them to the hosting environment only at go-live (B-80); preview deploys get their own set.
5. Tell Jordan his machine may be infected (the malware came in with commit `80d3b13`) and ask him to scan it and rotate his own tokens.

**What the user sees**
- Nothing visible. The live site keeps working after the Netlify environment is updated with the rotated keys.

**Engineering checks**
- Old keys no longer work (one test request each returns 401).
- `grep -rlE "_0x[0-9a-f]{5}|global\.i ?=" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git` finds only docs.

---

### B-02 Backup tag, database backup, staging branch
- [x] Done (PR #6)

Phase 1 · S · Depends on: nothing · Blocked by Jordan: no · D-45 · Branch: `task/B-02-backup-and-staging` → `main`

**Build**
1. `git tag original-backup` on the current `main` and push the tag.
2. Take a Supabase backup (dashboard backup or `pg_dump`) and store it outside the repo. Record row counts of every table.
3. Create the long-lived `mvp` branch from `main` and push it.
4. In Netlify, enable branch deploys for `mvp` so it gets its own staging URL. Auto-publish from `main` stays on (D-45).
5. Add a short "Branches" note to the repo README: `main` is live, `mvp` is the rebuild (staging URL), tasks use `task/B-xx-name` branches.

**What the user sees**
- The live site keeps working and updating from `main`; the rebuild has its own staging link to try.

**Engineering checks**
- `git ls-remote --tags origin` shows `original-backup`; `git ls-remote --heads origin mvp` shows the branch.
- A push to `mvp` produces a Netlify branch deploy, not a production deploy.

---

### B-03 Remove cut products and dead code
- [x] Done (PR #10)

Phase 1 · M · Depends on: B-02 · Blocked by Jordan: no · MVP_SPEC 17, D-04, D-05, D-06 · Branch: `task/B-03-remove-cut-products-and-dead` → `main`

**Build**
1. Delete every path in MVP_SPEC section 17, checking each for remaining imports first. Keep `/internal/admin/news` (LinkedIn Studio, D-07).
2. Move `src/app/api/admin/feature-requests/[id]` to `src/app/api/internal/admin/feature-requests/[id]` before deleting `src/app/api/admin/*`.
3. Remove `iron-session` and `src/lib/admin-session.ts`.
4. Add permanent redirects in `next.config.ts` for removed public pages (`/ai-employee`, `/ai-phone`, `/dm-ads`, `/customer-acquisition`, `/ads`, `/call-bar`, `/sales`, `/home-2`) to `/`, so old links and search results still land somewhere.
5. Remove cut products from `src/app/layout.tsx` metadata and JSON-LD, `src/app/sitemap.ts`, the header, footer, contact page options and chat widget topics.
6. Remove `chatgpt_ads` and `call_bar` values from the contact form and leads admin.

**What the user sees**
- Visiting `/ai-employee`, `/dm-ads`, `/ads`, `/call-bar` or `/sales` goes to the homepage.
- The header and footer no longer show "Ads" or other removed products.
- The contact form and chat widget only offer AEO topics.
- Everything that is kept (homepage, pricing, agency, compare, contact, login, dashboard, admin) still loads.

**Engineering checks**
- Each removed route returns a 308 redirect.
- A crawl of every kept route returns 200 (script in `scripts/check-routes.ts`).
- Bundle is smaller than before (note both sizes in the PR).

---

### B-04 Env validation, zod, server-only, generated types
- [x] Done (PR #13)

Phase 1 · M · Depends on: B-03 · Blocked by Jordan: no · MVP_SPEC 18.1 rules 6 and 7, D-79 · Branch: `task/B-04-env-validation-zod-server-only` → `main`

**Build**
1. Install `zod`, `@t3-oss/env-nextjs`, `server-only`.
2. Create `src/lib/env.ts`: every server and `NEXT_PUBLIC_` variable with its zod type; build fails if a required one is missing. List the variables from MVP_SPEC section 14.
3. Replace every `process.env.X` in `src/` with `env.X`.
4. Add `npm run db:types`: `supabase gen types typescript --project-id <id> > src/types/database.types.ts`. Type the Supabase clients in `src/lib/supabase/*` with `Database`.
5. Update `.env.example` to match `env.ts` exactly (removes the unused variables in MVP_SPEC 14).

**What the user sees**
- Nothing visible. If a key is missing on a server, the app refuses to start with a clear message instead of failing later on a customer's action.

**Engineering checks**
- Removing a required variable makes `npm run build` fail with the variable's name.
- `grep -rn "process\.env" src | grep -v src/lib/env.ts` returns nothing.

---

### B-05 Lint rules that enforce the architecture
- [x] Done (PR #17)

Phase 1 · S · Depends on: B-04 · Blocked by Jordan: no · MVP_SPEC 18.1 rules 1, 4, 5, 6, 8, 11, 12 · Branch: `task/B-05-lint-rules-that-enforce-the` → `main`

**Build**
1. Install `eslint-plugin-boundaries`. Define elements: `app`, `modules/*`, `components/ui`, `components/app`, `components/marketing`, `lib`, `proxy`.
2. Rules: components cannot import `modules/*/dal` or Supabase, Stripe or AI clients; modules cannot import another module's internals (only its `index.ts`); `proxy.ts` cannot import modules.
3. `no-restricted-syntax`: ban `process.env` outside `src/lib/env.ts`; ban `.auth.getSession(` in server code; ban `select("*")` outside `dal.ts`.
4. `max-lines`: warn at 250, error at 400 for `src/app/**` and `src/modules/**`. Existing oversized files get an `eslint-disable max-lines` comment with a TODO referencing the task that will split them.
5. Add a small script `scripts/check-auth-calls.ts`: every `actions.ts` and `route.ts` under `src/` must call `requireUser`, `requireAdmin`, or be listed as public (webhooks, worker, share page, compare).

**What the user sees**
- Nothing visible.

**Engineering checks**
- A deliberately bad import in a component fails lint (show the error in the PR, then remove it).
- `scripts/check-auth-calls.ts` passes and fails on a deliberately unauthenticated route.

---

### B-06 Test and eval tooling
- [ ] Done

Phase 1 · M · Depends on: B-04 · Blocked by Jordan: no · MVP_SPEC 21, 25, D-75, D-81 · Branch: `task/B-06-test-and-eval-tooling` → `main`

**Build**
1. Install Vitest with `vite-tsconfig-paths`; `vitest.config.ts` for `src/**/*.test.ts`.
2. Local database for tests: Supabase CLI (`supabase start`), with a `test` npm script that resets the local database from `supabase/migrations` before the suite.
3. Install Playwright (`@playwright/test`); `playwright.config.ts` with desktop (1440px) and mobile (390px) projects; `tests/e2e/` folder with one smoke test (homepage loads).
4. Install `vitest-evals` and `autoevals`; create the `evals/` folder skeleton from MVP_SPEC 25 with an `evals/README.md` that repeats the 12 eval principles and marks which are human tasks.
5. Add `tests/fixtures/ai-answers/`: recorded AI answers used by `is_test` agencies and tests (filled in B-31).

**What the user sees**
- Nothing visible.

**Engineering checks**
- `npm test`, `npx playwright test` and `npx vitest run evals` all run (smoke tests pass).

---

### B-07 CI on every pull request
- [ ] Done

Phase 1 · S · Depends on: B-05, B-06 · Blocked by Jordan: no · MVP_SPEC 21 · Branch: `task/B-07-ci-on-every-pull-request` → `main`

**Build**
Already in place from PR #4: `.github/workflows/security.yml` (scanners) and `ci.yml` (typecheck). Extend `ci.yml`:
1. Add lint (including boundaries and the auth-call check), unit tests with a local Supabase service container, build, and Playwright smoke tests.
2. `.github/workflows/eval-fast.yml`: code-graded eval suites on every pull request.
3. `.github/workflows/eval-ai.yml`: AI-graded suites only when files under `src/modules/*/prompts/`, model settings, or `evals/` change; uses repository secrets for the AI keys.
4. Ask Jordan (repo admin) to protect `main` and `mvp`: pull request required, required checks "Supply-chain scan", "Typecheck" and the new CI jobs, no force push, no deletion.
5. Add `husky` pre-push lint and build once lint is clean.

**What the user sees**
- Nothing visible. Broken code can no longer reach `main`.

**Engineering checks**
- A pull request with a type error is blocked by CI.

---

### B-08 Turn on Next.js 16 Cache Components
- [ ] Done

Phase 1 · M · Depends on: B-03 · Blocked by Jordan: no · D-80, MVP_SPEC 18.1 rule 14 · Branch: `task/B-08-turn-on-next-js-16` → `mvp`

**Build**
1. Read `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` and the Cache Components guide.
2. Set `cacheComponents: true` in `next.config.ts`.
3. Fix build errors: wrap runtime reads (`cookies()`, `headers()`, `searchParams`) in `<Suspense>`; mark static marketing data with `"use cache"` where appropriate; keep all logged-in data uncached.
4. Document the rule of thumb in `src/lib/README.md`: marketing pages cached, dashboard and admin dynamic.
5. **Hosting test (D-41)**: deploy this build to a Netlify preview (deploys stay off for production) and check every kept page, login and caching behaviour there. Record the result in DECISIONS.md under D-41.

**What the user sees**
- Every kept page loads as before. Marketing pages load faster.

**Engineering checks**
- `npm run build` passes; route summary pasted in the PR.
- Logged-in pages never show another user's data (test by logging in as two test agencies in two browsers).

---

### B-09 Design system foundation
- [ ] Done

Phase 1 · M · Depends on: B-03 · Blocked by Jordan: no · design/DESIGN.md, D-46 to D-50 · Branch: `task/B-09-design-system-foundation` → `mvp`

**Build**
1. Initialise shadcn/ui for Tailwind v4 (`npx shadcn@latest init`).
2. Put the DESIGN.md tokens into `src/app/globals.css` as CSS variables and map them to shadcn's variables (table at the end of DESIGN.md). Remove the old tokens and the extra blues.
3. `--radius: 4px`; Geist and Geist Mono via `next/font`; tabular numbers utility.
4. Add the base components: Button, Input, Card, Table, Tabs, Dialog, Sheet, DropdownMenu, Badge, Progress, Tooltip, Skeleton, Sonner, Form.
5. Create `src/app/(internal)/design-preview/page.tsx` (admin only): every component, colour and state on one page, the living version of `docs/design/palette-preview.html`.

**What the user sees**
- Nothing yet for customers. The team can open the design preview page and see every building block in the final look.

**Engineering checks**
- Contrast of text tokens re-checked with the DevTools contrast checker (values in DESIGN.md).
- No raw hex colours in `src/components/ui`.

---

## Phase 1 demo checklist

Walk through as a non-technical person:
1. Open the live site: it still works exactly as before.
2. Open an old link such as `/ai-employee` or `/ads`: it goes to the homepage.
3. Look at the header and footer on the new version (preview): no "Ads" or removed products.
4. Open the design preview page: buttons, cards and colours match `docs/design/palette-preview.html`, with strong blue and near-sharp corners.
5. Ask the developer to show a pull request where CI blocked a mistake.
