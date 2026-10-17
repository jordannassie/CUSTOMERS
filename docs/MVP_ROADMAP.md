# Customers.Direct MVP Roadmap

Audit date: 2026-09-23. Snapshot of what works, what is broken, and what is left before a paid MVP launch.

Line numbers were accurate on the audit date. If one has drifted, search for the quoted symbol instead.

## Status on 2026-10-15

Every box below was checked against the code on branch `mvp-bugs-fixes` on 2026-10-15. Most tasks were done in a new form when the app was rebuilt to MVP_SPEC, so the Problem, Where and Fix text under each task describes the old app; the line under each heading says what exists now. 39 of 50 boxes are ticked.

| Status | Tasks |
|---|---|
| Done | SEC-02 to SEC-07, SEC-09, CORE-01 to CORE-06, REL-01 to REL-06, REL-08, BILL-01, BILL-03, BILL-04, ACC-01 to ACC-04, ACC-06, GROW-02 to GROW-04, OPS-01, OPS-03 to OPS-06, CLEAN-01 to CLEAN-03 |
| Partly done | SEC-01 (key rotation not recorded), SEC-08 (`exec_sql` to check in the hosted projects), EMAIL-01 (no weekly report switch in Settings; sending domain not set up), OPS-02 (no `seed.sql`) |
| Waiting on a decision | BILL-02 sales tax (Jordan's Stripe tax registration) |
| After the MVP | REL-07 error tracking, GROW-01 analytics, ACC-05 cookie consent, NICE-01 team members |
| Not started | NICE-02 help center, NICE-03 guided tour |

Launch steps that are not code tasks: ACC-04 Confirm email in the hosted projects, REL-03 switching `enqueue_due_scans` to all agencies, and the email sending domain (EMAIL-01).

## How to use this file

- Every task has an ID (for example `SEC-01`). Reference it in commit messages and PR titles.
- Each task lists: **Problem**, **Where**, **Fix**, **Done when**.
- Tick the checkbox and add the PR/commit next to it when a task ships.
- Work top to bottom. Priority order is at the end of this file.
- Before marking any task done, run the checks in [Verification](#verification).

Priority tags:

- `P0` blocks launch (security, data correctness, money).
- `P1` should ship with the MVP.
- `P2` cleanup or nice to have.

## Scope update (2026-09-25)

Planning after this audit changed the scope. The decisions are in [DECISIONS.md](./DECISIONS.md) and the build plan in [MVP_SPEC.md](./MVP_SPEC.md). Where a task below conflicts with them, the spec wins. Effect on the tasks:

| Task | New status |
|---|---|
| SEC-01 | Code fixed in commit `577f748`. Key rotation still to do. |
| SEC-02 | Dropped: Agent Readiness is cut (D-05). Delete `src/lib/agent-readiness/*`. |
| SEC-03 | Still needed for any server-side fetch we keep (compare tool). Business pages are scraped through Firecrawl (D-18). |
| SEC-04 to SEC-07 | Unchanged. SEC-06: allow only the Supabase storage host once logos are uploaded files. |
| SEC-08 | Delete `apply-migration` and the `exec_sql` function (MVP_SPEC section 17). |
| SEC-09 | Keep `/internal/admin` with `requireAdmin()`; delete the PIN admin (D-35). |
| CORE-01 | Replaced by MVP_SPEC 5.1 and 5.2: all chosen models, with web search, per check. |
| CORE-02 | Gemini later (D-26). Remove the claims now (MVP_SPEC 12). |
| CORE-03 | Unchanged, see MVP_SPEC 5.5. |
| CORE-04 | Replaced by the Sources page and citations (MVP_SPEC 8.1). |
| CORE-05, CORE-06 | Replaced by the credit system: `credit_grants`, `credit_holds`, `credit_transactions`, `usage_events` on every check, and the entitlements module (MVP_SPEC 4.2, 13, D-58, D-60). |
| REL-01 | Unchanged (30-second timeout, 2 retries). |
| REL-02, REL-03 | Replaced by `scan_jobs` + pg_cron + Vercel worker (MVP_SPEC 6, D-41, D-42). |
| REL-04, REL-05 | Folded into the new onboarding (MVP_SPEC 3.1: saves after each step). |
| REL-06 | Unchanged. |
| REL-07 | Error tracking moved to after the MVP (D-44); interim alerts in MVP_SPEC section 22. |
| REL-08 | Unchanged. |
| BILL-01 to BILL-04 | Replaced by the new billing model: `agencies`, `business_subscriptions`, webhooks in MVP_SPEC 11. Tax only after a Stripe tax registration is confirmed. |
| EMAIL-01 | Confirmed: welcome, trial ending, payment failed, low credits, weekly report (D-37). |
| ACC-01, ACC-02 | Replaced by MVP_SPEC section 23 (soft delete, permanent after 30 days). |
| ACC-03, ACC-04 | Unchanged. |
| ACC-05 | Needed only once analytics is added (after the MVP). |
| GROW-01 | Analytics moved to after the MVP (D-44). |
| GROW-02, GROW-03 | Folded into the marketing site work (MVP_SPEC 12). |
| GROW-04 | In the MVP: Export PDF with agency logo, share link (D-12). |
| OPS-01 | Replaced by MVP_SPEC sections 21 (tests, CI, definition of done) and 25 (AI evals). |
| OPS-02 to OPS-06 | Unchanged. OPS-02: also add the new tables in MVP_SPEC 13. OPS-04: zod everywhere (MVP_SPEC 18.1). OPS-05: env var changes in MVP_SPEC 14. |
| CLEAN-01 to CLEAN-03 | Folded into the removal list (MVP_SPEC 17). |
| NICE-01 | Team members: after the MVP (D-10). |
| BILL-04 (2026-10-14) | Done in Stripe test mode: signup, real card form, trial with 100 credits, first scan, a 500-credit top-up (granted once), upgrade to Pro, cancel and keep, and a failed payment (past due, banners, scans paused). 12 webhook events, all processed once with no error. Emails could not be sent locally (no `EMAIL_FROM` or Resend key) but each was attempted. |
| SEC-04, SEC-07 (2026-10-14) | Full CSP enforced; rate limits refuse when their store fails; feature requests limited per user (BUG-174 to BUG-176). Captcha skipped for now. |
| OPS-05 (2026-10-14) | `BILLING_ENABLED` removed too: a search showed nothing read it. |
| CLEAN (2026-10-14) | Done: the last old files (`src/config/pricing.ts`, `src/config/product-access.ts`, `src/lib/trial.ts`, `/api/user/trial`, `src/lib/google-places.ts`, and `prompt-engine`, `scanner`, `competitor-discovery`, `competitor-search` in `src/lib/geo`) are deleted. File references below are from the audit date. |

## Product in one paragraph

Customers.Direct is a paid SaaS dashboard that checks whether AI assistants (ChatGPT, Claude, Perplexity) mention a local business and its competitors, turns that into a "Direct Score", and suggests opportunities. The rest of the site (`/ai-phone`, `/dm-ads`, `/agency`, `/call-bar`, `/ads`, `/sales`) is marketing and lead capture for the same company.

User journey: `/signup` → `src/proxy.ts` auth gate → `OnboardingWizard` → `/api/geo/scan` → `/api/geo/businesses` → `/api/geo/competitors/discover` → `/api/geo/prompts/generate` → `/api/geo/visibility/run` → `/dashboard`.

Stack: Next.js 16.3 (App Router, `src/proxy.ts` instead of `middleware.ts`), React 19, Supabase (auth, Postgres, storage), Stripe, Tailwind v4, deployed on Netlify.

## Current state

This section is the audit-date snapshot (2026-09-23) and is kept for history. Many files it names are deleted; see [Status on 2026-10-15](#status-on-2026-10-15) for today.

Overall: roughly 70% of an MVP. The core flow is real, not mocked.

What works (real data, real APIs):

- Signup, Google OAuth, login redirects (`src/proxy.ts:40-55`).
- Onboarding wizard, website scan, add business, edit business, multi-business switcher.
- AI calls to OpenAI, Anthropic and Perplexity (real `fetch` calls).
- Dashboard pages: visibility, competitors, prompts, opportunities, citations, SEO (DataForSEO), Direct Agent chat, agent readiness.
- Trend history (`visibility_scores` rows are appended per run).
- Daily re-scan: Netlify scheduled function, protected by `x-cron-secret`.
- Stripe checkout, signed and idempotent webhook, proration on plan change.
- RLS enabled on every table the code queries.
- Public `/api/public/compare`: rate limited and SSRF guarded, no paid AI calls.
- Privacy and terms pages have real content.
- `tsc --noEmit` passes.

Intentionally demo data (fine, marketing only): `/sales/dashboard`, `GEODashboardShowcase`, `AgencyWorkspaceDemo`, `HomepagePlatform`, `MissedRevenueScanner`.

Beta mode: `src/config/product-access.ts` sets `betaFreeAccess = true` unless `BETA_FREE_ACCESS=false`. Billing limits are therefore off today. Flipping that flag alone is NOT enough, see the `BILL-*` tasks.

---

## P0: Security

### SEC-01 Malware still present in postcss config
- [ ] Partly done (2026-10-15): the payload is gone (`postcss.config.mjs` is 94 bytes, the grep finds only `scripts/scan-payload.sh` and this file; commit `577f748`). **Left:** no record that the keys were rotated. Rotate them, then tick.

**Problem:** `postcss.config.mjs` is about 32KB. After `export default config;` there is a long run of spaces followed by obfuscated JavaScript (`global.i = ...; const _0x32ebc7=...`). Commit `0d84be4` ("remove injected malware payload") only added blank lines, so the payload is still in `HEAD` and `origin/main`. It runs on every `next dev` and `next build`.

**Where:** `postcss.config.mjs`

**Fix:**
1. Replace the file with exactly:
   ```js
   const config = {
     plugins: {
       "@tailwindcss/postcss": {},
     },
   };

   export default config;
   ```
2. Rotate every secret that was ever in `.env.local` or Netlify env: Supabase service role and anon keys, Stripe secret and webhook secret, OpenAI, Anthropic, Perplexity, DataForSEO, Google Places, `ADMIN_PIN`, iron-session secret, `GEO_CRON_SECRET`.
3. Rotate GitHub tokens and SSH keys on any machine that ran the app. Check those machines for persistence.
4. Find out how the payload got in (compromised contributor machine, dependency, CI). Check `git log -p postcss.config.mjs` and other config files.

**Done when:** `wc -c postcss.config.mjs` is under 200 bytes, `grep -rlE "_0x[0-9a-f]{5}|global\.i ?=" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git` returns nothing, and all keys are rotated.

### SEC-02 SSRF in WebMCP manifest fetch
- [x] Done, dropped (2026-10-15): Agent Readiness is cut (D-05) and `src/lib/agent-readiness` is deleted (`eb56b10`).

**Problem:** The agent readiness scanner reads `<link rel="webmcp" href="...">` from the scanned page and fetches that URL with no safety check, then returns up to 2000 chars of the response to the user. A user can point their business domain at a page they control and make the server fetch internal addresses (for example cloud metadata at `169.254.169.254`).

**Where:** `src/lib/agent-readiness/webmcp-detector.ts:76-94`, triggered by `POST /api/geo/agent-readiness`.

**Fix:** Run `manifestUrl` through the same `assertSafeUrl` guard (after SEC-03 hardens it). Only allow same-origin manifests if possible. Do not return `raw` to the client, or strip it.

**Done when:** A page serving `<link rel="webmcp" href="http://169.254.169.254/">` produces no outbound request to that address.

### SEC-03 Harden `assertSafeUrl`
- [x] Done in new form (2026-10-15): one `safeFetch` in `src/lib/net/safe-fetch.ts` with `ip-policy.ts` (checks the address at connect time, re-checks each redirect, blocks private IPv4 and IPv6 ranges). The compare tool uses it (`src/modules/readiness-check/fetch-site.ts`); no other server fetch of a user URL is left (`b0b3f0a`).

**Problem:** The guard is duplicated and has gaps:
- Both scanners use `redirect: "follow"`, so a safe URL can 302 to an internal IP.
- Only the exact `169.254.169.254` is blocked, not all of `169.254.0.0/16`. `100.64.0.0/10` is not blocked.
- IPv6 private, ULA and link-local ranges are not blocked (only `::1`).
- Hostnames are never resolved, so DNS rebinding works.

**Where:** `src/lib/geo/scanner.ts:26-64, 144`, `src/lib/agent-readiness/scanner.ts:27-62, 84`.

**Fix:** Move the guard into one shared module (for example `src/lib/net/safe-fetch.ts`). Resolve DNS and check every resolved IP. Use `redirect: "manual"` and re-validate each hop (cap at 5). Cover full private IPv4 and IPv6 ranges. Use it from every server-side fetch of a user-supplied URL.

**Done when:** One `safeFetch` helper is used by both scanners, the WebMCP detector and the compare route, and redirects to private IPs are rejected.

### SEC-04 Security headers
- [x] Done (2026-10-15): `src/lib/security-headers.ts`, applied in `next.config.ts`: HSTS with `includeSubDomains`, nosniff, Referrer-Policy, `X-Frame-Options: DENY`, and the full CSP enforced with `frame-ancestors 'none'` (`b0b3f0a`, `7a3312d`, BUG-175).

**Problem:** No CSP, HSTS, X-Frame-Options or `frame-ancestors` anywhere. `next.config.ts` only sets headers for `/embed/call-bar.v1.js`.

**Where:** `next.config.ts`

**Fix:** Add a global `headers()` entry with HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'` (except any route that is meant to be embedded), and a CSP. Start CSP in `Content-Security-Policy-Report-Only` and tighten.

**Done when:** `curl -I` on `/` and `/dashboard` shows the headers.

### SEC-05 SVG logo upload not sanitized
- [x] Done in new form (2026-10-15): `checkLogo` in `src/modules/settings/service.ts` reads the file's own bytes (PNG, JPEG, WebP only), refuses SVG and caps the size at 2 MB (`b0b3f0a`).

**Problem:** Logo upload trusts the client MIME type and accepts `image/svg+xml`, then stores it in a public bucket. SVG can contain scripts.

**Where:** `src/app/api/geo/businesses/logo/route.ts:22, 39, 47, 57`

**Fix:** Drop SVG support, or sanitize it (for example DOMPurify on the server). Check magic bytes, not `file.type`. Enforce a size limit.

### SEC-06 Open image proxy
- [x] Done (2026-10-15): `images.remotePatterns` allows only the Supabase host at `/storage/v1/object/public/**` (`b0b3f0a`).

**Problem:** `images.remotePatterns` allows `hostname: "**"`, so the Next image optimizer will fetch and resize any HTTPS image for anyone.

**Where:** `next.config.ts:57-60`

**Fix:** Restrict to the Supabase storage host and known logo/favicon hosts, or serve user logos with `unoptimized`.

### SEC-07 Rate limit public write endpoints
- [x] Done (2026-10-15): `src/modules/rate-limit` keeps counts in the database (`rate_limit_hit`) and refuses when that store fails. Used by `/api/contact`, `/api/public/compare` and feature requests; `/api/leads` no longer exists (`5c20a53`, `7a3312d`). Captcha skipped for now at the owner's request.

**Problem:** `/api/contact` and `/api/leads` only have a honeypot. `/api/public/compare` rate limits with an in-memory `Map`, which does not work across serverless instances.

**Where:** `src/app/api/contact/route.ts`, `src/app/api/leads/route.ts`, `src/app/api/public/compare/route.ts:15-28`

**Fix:** Use a shared store (Upstash Redis or a Supabase table) for per-IP limits on all three. Consider Turnstile or hCaptcha on the contact form.

### SEC-08 `exec_sql` RPC
- [ ] Partly done (2026-10-15): the `apply-migration` route is deleted (`eb56b10`) and `exec_sql` is not in the local database. **Left:** it was made by hand in the hosted project, so check `customers-dev` and live with `select proname from pg_proc where proname = 'exec_sql'` and drop it there in a new migration if found (build plan B-03).

**Problem:** `/api/internal/admin/apply-migration` calls `svc.rpc("exec_sql", { sql })`. The SQL is hardcoded today, but an RPC that runs arbitrary SQL is dangerous if its grants are wider than service role.

**Where:** `src/app/api/internal/admin/apply-migration/route.ts:1-42`, the `exec_sql` function in the Supabase project (not in `supabase/migrations`).

**Fix:** Confirm in Supabase that `exec_sql` is only executable by `service_role` (`REVOKE EXECUTE ... FROM anon, authenticated`). Better: delete the route and the function, and apply migrations with the Supabase CLI (see OPS-02).

### SEC-09 One admin system
- [x] Done (2026-10-15): `grep -rn "ADMIN_PIN\|iron-session\|OWNER_ADMIN_EMAILS" src` returns nothing; admin is `/internal/admin` with `requireAdmin()` (`167914b`).

**Problem:** Three admin gates:
1. `/admin/*` with a PIN and iron-session (`src/lib/admin-session.ts`, `src/app/api/admin/login/route.ts:11`).
2. `/internal/admin/*` with Supabase auth plus `ADMIN_EMAILS` or `profiles.account_type = 'admin'` (`src/lib/admin/require.ts:19-40`).
3. A hardcoded email in `src/app/dashboard/page.tsx:20` (`OWNER_ADMIN_EMAILS`).

**Fix:** Keep `/internal/admin` (`requireAdmin`). Move the `/admin` pages (contacts, call-bar leads, prospecting) under it, switch `/api/admin/*` to `requireAdmin`, delete the PIN login and iron-session. Replace `OWNER_ADMIN_EMAILS` with the same `requireAdmin` logic.

**Done when:** `grep -rn "ADMIN_PIN\|iron-session\|OWNER_ADMIN_EMAILS" src` returns nothing.

---

## P0: Core product correctness

These are what customers pay for. If they are wrong, the product is wrong.

### CORE-01 Scans query only one AI model
- [x] Done in new form (2026-10-15): each scan makes one check per chosen model per question (`src/modules/scanning/service.ts`), every model with web search and the business location (MVP_SPEC 5.1, 5.2).

**Problem:** `runVisibilityForBusiness` uses `configured[0]` when no `providerId` is passed, and no caller passes one. With `OPENAI_API_KEY` set, Claude and Perplexity never run. Every paid plan sells `aiModelCount: 3`.

**Where:** `src/lib/geo/run-visibility.ts:58-61`. Callers: `src/app/api/geo/visibility/run/route.ts:48`, `src/app/api/geo/cron/run-monitoring/route.ts:159`, `src/components/geo/OnboardingWizard.tsx:238`. Registry: `src/lib/geo/providers/index.ts:12-19`.

**Fix:** Run every configured provider (bounded by the plan's `aiModelCount`) for each prompt. Store `provider` on each `visibility_results` row (check the column exists). Compute scores per provider and overall. Update dashboard views (`ModelVisibilityGrid` etc.) to show per-model results.

**Done when:** One scan with all three keys set writes results for all three providers, and the dashboard shows each model separately.

### CORE-02 Gemini / Google AI advertised but not built
- [x] Done (2026-10-15): Gemini is later (D-26) and `grep -ri gemini src` returns nothing.

**Problem:** Marketing says Gemini / Google AI is covered, but `google_ai_overviews: null` in the registry and there is no Gemini adapter.

**Where:** `src/lib/geo/providers/index.ts:16-18`; claims in `src/app/page.tsx:8`, `src/app/pricing/page.tsx:218`, `src/app/compare/CompareClient.tsx:325, 736`.

**Fix:** Either add a Gemini adapter (`src/lib/geo/providers/gemini.ts`, reading `GEMINI_API_KEY`) or remove Gemini/Google from all copy. Do not ship the claim without the feature.

### CORE-03 Brand mention matching gives false positives
- [x] Done (2026-10-15): `src/modules/scanning/mentions.ts` and `short-brand.ts` match on word boundaries with aliases, domain and city context. Tests: `mentions.test.ts` ("Ace" inside space, race, Acer) and `mentions-short-brand.test.ts`.

**Problem:** `normalizedAnswer.includes(businessName.toLowerCase())`. Short or common names ("Ace", "Prime", "Best") match unrelated words, inflating mention rate and Direct Score. Same for competitors.

**Where:** `src/lib/geo/providers/types.ts:33, 48`

**Fix:** Match on word boundaries. Also match the business domain and known aliases (store aliases on `businesses`). Strip generic suffixes ("LLC", "Inc"). Optionally confirm ambiguous matches with city/domain context. Add unit tests with tricky names.

**Done when:** Tests cover names like "Ace" against text containing "space" and "ace in the hole", and pass.

### CORE-04 Show where an answer came from
- [x] Done in new form (2026-10-15): the Sources page and citations (`src/app/(app)/sources/page.tsx`, `src/modules/sources`, B-54).

**Problem:** Each provider sets a `methodology` field (raw model memory vs Perplexity live web search), but no dashboard component displays it.

**Where:** `src/lib/geo/providers/openai.ts:46-49`, `anthropic.ts:50-53`, `perplexity.ts:48-51`

**Fix:** Show a small "Live web" / "Model memory" badge per result and per model in the visibility views.

### CORE-05 Enforce plan limits on the server
- [x] Done in new form (2026-10-15): credits replaced plan limits and the daily cap. `src/modules/entitlements` and `src/modules/credits` are checked on the server, and a scan is refused when credits run out (`src/modules/jobs/actions.ts`).

**Problem:** `src/lib/billing/entitlements.ts` defines `canAddPrompt`, `canAddCompetitor`, `canRunManualScan`, `canUseDirectAgent`, `canUseSeoIntelligence`, `canAddBusinessToAccount`, `getBusinessEntitlements`. None of them are called anywhere. `maxManualScansPerDay: 5` (`src/config/product-access.ts:78`) is never enforced. The only guard on scans is a 2 minute cooldown (`src/app/api/geo/visibility/run/route.ts:9, 33-42`), so a user can trigger paid AI calls every 2 minutes forever.

**Where:** Call sites to add: `POST /api/geo/businesses`, `/api/geo/competitors`, `/api/geo/prompts`, `/api/geo/prompts/generate`, `/api/geo/visibility/run`, `/api/geo/scan`, `/api/geo/direct-agent`, `/api/geo/seo`.

**Fix:** Call the matching `can*` check at the top of each route and return `402` or `403` with a clear message. Apply the manual scan daily cap even in beta mode (it is cost protection, not billing).

**Bug to fix first:** `src/lib/billing/entitlements.ts:213` uses `.eq("billing_account_id", ba.status)`. It must be `ba.id`.

**Done when:** Each listed route calls an entitlement check, and a 6th manual scan in one day is rejected.

### CORE-06 Record usage and cost
- [x] Done in new form (2026-10-15): `recordCheckUsage` (`src/modules/scanning/cache.ts`) writes a `usage_events` row for every check, cache hits included; name extraction, insights and background AI jobs write rows too. The admin cost page reads them.

**Problem:** `src/lib/billing/usage.ts` (`recordUsage`, `recordVisibilityChecks`, `recordDirectAgentUsage`, `recordDataForSeoUsage`) is never called, so `usage_events` stays empty and `/internal/admin/usage` shows nothing.

**Fix:** Call the right `record*` function after each paid external call (AI providers, DataForSEO, Google Places).

**Done when:** A scan creates `usage_events` rows and the admin usage page shows them.

---

## P0: Reliability

### REL-01 Timeouts and retries on AI calls
- [x] Done (2026-10-15): `src/modules/scanning/providers/request.ts`: 30 second timeout per try (60 for OpenAI, BUG-083), 2 retries with backoff on 429, 5xx and network errors (`ebd7f06`).

**Problem:** The provider `fetch` calls have no `signal`, so one hung request hangs the scan. No retry or 429 backoff.

**Where:** `src/lib/geo/providers/anthropic.ts:17-29`, `openai.ts:17-28`, `perplexity.ts:17-27`

**Fix:** Add `signal: AbortSignal.timeout(20_000)` (tune per provider). Retry once or twice with backoff on 429 and 5xx. Set `max_tokens`.

### REL-02 Long scans on Netlify
- [x] Done in new form (2026-10-15): `scan_jobs` queue and worker (`src/modules/jobs/`, migrations 028, 033, 050). Run scan returns at once and the page follows the job.

**Problem:** `/api/geo/visibility/run` does the whole scan synchronously (up to 12 prompts, times 3 providers after CORE-01) and has no `maxDuration`. It will hit Netlify function limits and return 502/504.

**Where:** `src/app/api/geo/visibility/run/route.ts`, `src/lib/geo/run-visibility.ts:24-25`

**Fix:** Make the route create a `visibility_runs` row with status `queued` and return right away. Do the work in a Netlify Background Function (15 min limit) or a queue. The UI polls the run status and shows progress. Reuse the same worker for onboarding and cron.

**Done when:** Clicking "Run scan" returns in under 1 second and the result appears when the run finishes.

### REL-03 Daily cron can be cut off, and handles 20 businesses per run
- [x] Done in new form (2026-10-15): pg_cron `enqueue-due-scans`, `call-scan-worker` every minute and `reset-stuck-jobs` (migration 029), no batch cap. **Launch step:** `enqueue_due_scans(false)` still scans only test agencies until it is switched to `(true)` (`supabase/migrations/README.md`).

**Problem:** The scheduled function does a plain `fetch` to a route allowed 60s; the scheduled function itself can be killed first. The route processes at most 20 businesses per run (200 fetched), so it falls behind as customers grow.

**Where:** `netlify/functions/geo-scheduled-monitoring.mts:18-21`, `src/app/api/geo/cron/run-monitoring/route.ts:8, 65-216`

**Fix:** Have the cron only enqueue due businesses (same queue as REL-02). Workers process them. Remove the fixed batch cap.

### REL-04 Onboarding cannot be resumed
- [x] Done in new form (2026-10-15): onboarding saves after each step and resumes from `businesses.onboarding_step` (`src/modules/onboarding/wizard/steps.ts`).

**Problem:** Wizard state is only in React state. A `businesses` row is created with `status: "onboarding"` early. If the user leaves and returns, `dashboard/page.tsx:34` renders a fresh wizard, and finishing it creates a second orphaned business.

**Where:** `src/components/geo/OnboardingWizard.tsx:99-115`, `src/app/api/geo/businesses/route.ts:41`, `src/app/dashboard/page.tsx:34`

**Fix:** On load, look for the user's business in `onboarding` status and resume at the right step (derive the step from what exists: competitors, prompts, runs). Or reuse and overwrite that row.

### REL-05 First scan failure is silent
- [x] Done in new form (2026-10-15): the first-scan page shows a failed state with the reason and a retry (`src/modules/onboarding/first-scan.ts`, `src/app/(app)/onboarding/first-scan/page.tsx`; `54d44ad`, `1c81544`).

**Problem:** If the first visibility run fails, the wizard still goes to "done" and the user lands on an empty dashboard with no explanation.

**Where:** `src/components/geo/OnboardingWizard.tsx:244`

**Fix:** Show an error with a "retry scan" button, or land on the dashboard with a clear banner explaining the scan failed.

### REL-06 Error, 404 and loading pages
- [x] Done (2026-10-15): `src/app/error.tsx`, `not-found.tsx`, `global-error.tsx`, plus `error.tsx` and `loading.tsx` under `(app)` and `internal/admin` (`c1d7a69`, `1b96c94`, `7a3312d`).

**Problem:** There is no `error.tsx`, `not-found.tsx`, `loading.tsx` or `global-error.tsx` anywhere in `src/app`.

**Fix:** Add branded `src/app/not-found.tsx`, `src/app/global-error.tsx`, and `error.tsx` + `loading.tsx` under `src/app/dashboard/`.

### REL-07 Error tracking and logging
- [ ] After the MVP (D-44): no Sentry. Meanwhile the admin alerts check every 15 minutes (D-76, migration 037) and failed AI calls are logged.

**Problem:** No Sentry or equivalent. Server errors only go to `console.error`. `/internal/admin/errors` only lists failed `visibility_runs`, not app errors.

**Fix:** Add Sentry (`@sentry/nextjs`) for server, client and edge. Tag errors with user and business IDs. Rename the admin page to "Scan failures" or feed it real errors.

### REL-08 Expired session in the dashboard
- [x] Done (2026-10-15): `requireUser()` sends an expired session to `/login?next=...`, and `src/app/_components/session-watcher.tsx` with `src/lib/session-expired.ts` does the same for client fetches (`c1d7a69`).

**Problem:** API routes return 401 when the session expires (`src/lib/geo/api-auth.ts:11-27`), but dashboard components only show a generic "failed" message.

**Fix:** A shared client fetch helper that redirects to `/login?next=<current path>` on 401.

---

## P0/P1: Billing

Do all of these before setting `BETA_FREE_ACCESS=false`. (2026-10-15: that flag and beta mode are gone; billing is always on.)

### BILL-01 Paid users read from the wrong table
- [x] Done in new form (2026-10-15): `src/lib/trial.ts` is deleted and no code reads `subscriptions`; billing uses `agencies` and `business_subscriptions` (MVP_SPEC 11). The old table stays, read-only (migration 047), until the additive rule ends (D-43).

**Problem:** `src/lib/trial.ts:153` reads the legacy `subscriptions` table for the non-beta access check. The Stripe webhook only writes `billing_accounts` and `business_billing_items`. After beta ends, real subscribers will be treated as unpaid.

**Fix:** Make `trial.ts` use `billing_accounts` (via `src/lib/billing/accounts.ts`). Then drop or archive `subscriptions` (migration 006).

### BILL-02 Sales tax / VAT
- [ ] Not done, on hold (2026-10-15): no `automatic_tax` in the code. Turn it on only after Jordan confirms a tax registration in Stripe (MVP_SPEC 11).

**Problem:** No `automatic_tax` or `tax_id_collection` in checkout or plan change.

**Where:** `src/app/api/stripe/checkout/route.ts:107-128`, `src/app/api/stripe/change-plan/route.ts`

**Fix:** Enable Stripe Tax, set `automatic_tax: { enabled: true }` and `customer_update: { address: "auto" }`, and decide on tax ID collection.

### BILL-03 Trial ending reminder
- [x] Done (2026-10-15): the webhook handles `customer.subscription.trial_will_end` and sends the trial ending email (`src/modules/billing/webhooks/handlers.ts`, `src/modules/email/templates/trial-ending.tsx`).

**Problem:** The webhook does not handle `customer.subscription.trial_will_end`.

**Where:** `src/app/api/stripe/webhook/route.ts:14-25`

**Fix:** Handle it and send an email (needs EMAIL-01).

### BILL-04 Test the non-beta path end to end
- [x] Done (2026-10-14): run in Stripe test mode, see the scope table above (`7a3312d`).

**Fix:** In Stripe test mode with `BETA_FREE_ACCESS=false`: sign up, start trial, add business, hit a plan limit, upgrade, fail a payment (card `4000 0000 0000 0341`), cancel. Confirm access changes at each step.

---

## P1: Email

### EMAIL-01 Transactional email
- [ ] Partly done (2026-10-15): Resend in `src/modules/email/` sends the 5 emails decided in D-37 (welcome, trial ending, payment failed, low credits, weekly report), with a signed one-click unsubscribe on the weekly report. **Left:** (1) Settings has no switch for the weekly report: `saveEmailPreferences` exists but no screen calls it, so a user who unsubscribes cannot turn it back on; (2) the sending domain and `EMAIL_FROM` are not set up, so no email has gone to a real inbox. "Scan finished" and "subscription canceled" emails were left out by D-37.

**Problem:** No email provider in the codebase. Users get no emails from the app itself (Supabase auth emails only).

**Fix:** Add a provider (Resend or Postmark). Minimum emails:
- Welcome after signup.
- First scan finished (or failed).
- Weekly visibility summary.
- Payment failed (`invoice.payment_failed`).
- Trial ending (BILL-03).
- Subscription canceled.

Add an unsubscribe link and a per-user email preference for the weekly summary.

---

## P1: Account and compliance

### ACC-01 Delete account
- [x] Done in new form (2026-10-15): Settings, Delete account: soft delete, purged after 30 days by the `purge-deleted-accounts` cron (`src/modules/account/actions.ts`, `purge.ts`, migration 042, MVP_SPEC 23).

**Problem:** No self-service account deletion. The privacy policy (`src/app/privacy/page.tsx:83`) says to contact support.

**Fix:** Settings → "Delete account": cancel Stripe subscriptions, delete businesses and related rows, delete storage files, delete the Supabase auth user (service role). Confirm with typed text.

### ACC-02 Delete a business
- [x] Done in new form (2026-10-15): `deleteBusiness` in `src/modules/account/actions.ts`: soft delete, purged after 30 days or when the paid period ends, whichever is later.

**Problem:** `src/app/api/geo/businesses/[id]/route.ts` only has `PATCH`. `cancel-business` only changes billing.

**Fix:** Add `DELETE` that checks ownership, cancels billing for that business, and deletes its data (or soft deletes with a purge job).

### ACC-03 Change email and password in app
- [x] Done (2026-10-15): `changeEmail` and `changePassword` in `src/modules/account/actions.ts`, used by `src/components/settings/AccountForm.tsx`.

**Problem:** Email is read-only in settings (`src/app/dashboard/settings/page.tsx:84`). Password change links to forgot-password (`:90-96`).

**Fix:** Use `supabase.auth.updateUser({ email })` and `updateUser({ password })` from settings.

### ACC-04 Email verification and password reset
- [x] Done in code (2026-10-15): `enable_confirmations = true` in `supabase/config.toml`, and reset links go through `/auth/callback?next=/reset-password`. **Left:** turn on Confirm email in the hosted projects and test with a real inbox once email sending is set up.

**Problem:** Signup copy says verification may be off (`src/components/geo/AuthForm.tsx:114-116`); nothing in code enforces it. Password reset redirects straight to `/reset-password` (`src/components/geo/ForgotPasswordForm.tsx:24`) instead of through `/auth/callback`.

**Fix:** Turn on "Confirm email" in Supabase and document it. Route reset links through `/auth/callback?next=/reset-password` so the code exchange happens on the server. Test with a real inbox.

### ACC-05 Cookie consent
- [ ] After the MVP: only needed with analytics (GROW-01). Today only login cookies are used, as the privacy page says.

**Fix:** Add a consent banner before any analytics (GROW-01) loads. Needed for EU/UK visitors.

### ACC-06 Data retention
- [x] Done (2026-10-15): the retention rules are in the privacy policy (`src/app/privacy/_sections/retention.tsx`), with cleanup jobs for rate-limit rows (migration 039), cron history (029) and deleted accounts (042).

**Fix:** Decide how long `visibility_results` and raw AI answers are kept, state it in the privacy policy, and add a cleanup job if needed.

---

## P1: Growth basics

### GROW-01 Product analytics
- [ ] After the MVP (D-44): no PostHog or Plausible yet.

**Problem:** No analytics at all.

**Fix:** Add PostHog or Plausible. Track the funnel: visit → signup → onboarding complete → first scan → trial → paid.

### GROW-02 Page metadata
- [x] Done (2026-10-15): `/pricing` exports `metadata` through `pageMetadata()` in `src/lib/site-metadata.ts`; `/dm-ads` was removed (`2359ef2`, B-74).

**Problem:** `/pricing` and `/dm-ads` are `"use client"` pages with no `metadata`, so they inherit the homepage title.

**Fix:** Split each into a server `page.tsx` that exports `metadata` and renders a client component.

### GROW-03 Sitemap
- [x] Done in new form (2026-10-15): `src/app/sitemap.ts` reads `PUBLIC_PAGES` (home, pricing, agency, compare, contact, privacy, terms); pages that no longer exist are gone from it (`2359ef2`).

**Problem:** `src/app/sitemap.ts` lists 8 URLs and misses `/pricing`, `/compare`, `/contact`, `/customer-acquisition`, `/agency`.

### GROW-04 Report export and share
- [x] Done in new form (2026-10-15): PDF export with the agency logo and a read-only share link with a random token (`src/modules/reports/`, `src/app/r/[token]/`, `tests/e2e/share.spec.ts`; `e708c9c`, B-60).

**Problem:** Export and Share buttons are disabled "coming soon".

**Where:** `src/app/dashboard/reports/page.tsx:43-60`

**Fix:** PDF export of the current report, plus a read-only share link with a random token.

---

## P1: Quality and ops

### OPS-01 Tests and CI
- [x] Done in new form (2026-10-15): Vitest (`npm test`), Playwright specs in `tests/e2e`, AI evals in `evals/`, and `.github/workflows/ci.yml` running typecheck, lint, tests, build and smoke e2e on every PR (MVP_SPEC 21, 25).

**Problem:** No test files, no `test` script, no `.github/workflows`.

**Fix:**
- Add Vitest for pure logic first: `direct-score.ts`, mention matching (CORE-03), `assertSafeUrl` (SEC-03), entitlements (CORE-05).
- Add Playwright for: signup, onboarding, run scan, checkout (Stripe test mode).
- Add a GitHub Actions workflow running `lint`, `tsc --noEmit`, `test`, `build` on every PR.

### OPS-02 Migrations process
- [ ] Partly done (2026-10-15): the Supabase CLI flow is written up in `supabase/migrations/README.md`, and the second `013` file is now `019_contact_source_fields` (`956633e`, B-10). **Left:** there is no `supabase/seed.sql`; demo data comes from `npm run seed:test-agency` instead. Decide whether that is enough, then tick.

**Problem:** Migrations are applied by hand. Two files share number `013` (`013_agent_readiness.sql`, `013_contact_source_fields.sql`). No seed data.

**Fix:** Adopt the Supabase CLI (`supabase db push`), rename one `013` file to the next free number (check which order production applied them in first), add `supabase/seed.sql` with a demo business, and document it in the README.

### OPS-03 Lint errors
- [x] Done (2026-10-15): `npx eslint src` exits 0 (0 errors, 6 warnings).

**Problem:** `eslint src` reports 14 errors and 41 warnings. Main errors: `setState` inside effects (`admin/contacts/page.tsx:73`, `compare/CompareClient.tsx:378`, `LeadsClient.tsx:347`, `NewsClient.tsx:261`, `ChatWidget.tsx:104`, `AuthForm.tsx:47`, `ContactForm.tsx:84`), impure call during render (`BillingPageClient.tsx:347`), reassign after render (`internal/admin/accounts/page.tsx:66`), unescaped quotes (`NewsClient.tsx:422`, `internal/admin/pricing/page.tsx:147`), raw `<a>` (`internal/admin/users/page.tsx:71`).

**Done when:** `npx eslint src` exits 0.

### OPS-04 Input validation
- [x] Done (2026-10-15): every route handler validates with zod or checks a signed token (webhook, cron, unsubscribe), and Server Actions validate with zod schemas (MVP_SPEC 18.1).

**Problem:** 49 API routes validate input by hand with `typeof` checks. Example: `src/app/api/stripe/invoices/route.ts:36` passes `NaN` to Stripe for a bad `limit`.

**Fix:** Add `zod` schemas for request bodies and query params, starting with routes that write data or spend money.

### OPS-05 Env var mismatches
- [x] Done (2026-10-15): DataForSEO, Gemini, `CLAUDE_API_KEY`, `GOOGLE_AI_API_KEY`, `PROVIDER_COST_CONFIG` and `BILLING_ENABLED` are gone; every env var is read and checked in `src/lib/env.ts`, which matches `.env.example`.

**Problem:**
- `src/app/internal/admin/settings/page.tsx:51` checks `DATAFORSEO_LOGIN`; the client reads `DATAFORSEO_USERNAME`.
- The admin settings page shows "Gemini configured" but no code uses Gemini (see CORE-02).
- `.env.example` documents `CLAUDE_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, none of which the app code reads.
- `PROVIDER_COST_CONFIG` in `src/config/pricing.ts:481-518` has entries for providers that do not exist.

**Fix:** Align names, remove unused vars and config, or implement them.

### OPS-06 README
- [x] Done (2026-10-15): `README.md` covers setup, env vars, migrations, the job worker, local Stripe webhooks (`stripe listen`) and links this file (`5b08b11`).

**Problem:** README is the starter template: says Next.js 15, documents only 3 env vars, says nothing about Stripe, AI providers, cron, or migrations.

**Fix:** Rewrite it: what the app is, setup, all env vars (point to `.env.example`), how to apply migrations, how to run the cron locally, how to test Stripe webhooks (`stripe listen`), and a link to this file.

---

## P2: Cleanup and nice to have

- [x] **CLEAN-01** Done (2026-10-15): `Header.tsx` and `MainHeader.tsx` are deleted. Was: Delete unused components: `src/components/Header.tsx`, `src/components/MainHeader.tsx`. Check `GEOHeader.tsx`, `AIHeader.tsx` for imports first.
- [x] **CLEAN-02** Done (2026-10-15): `src/app/home-2` is deleted. Was: Decide on `src/app/home-2/page.tsx`. Remove it if it is not an active test.
- [x] **CLEAN-03** Done (2026-10-15): `src/app/opengraph-image.tsx`, `icon.png` and `apple-icon.png`; no storage URLs in `layout.tsx` (`2359ef2`). Was: OG image and favicon are hardcoded Supabase storage URLs (`src/app/layout.tsx:6-9, 43-57`). Move them to `src/app/opengraph-image.*` and `src/app/icon.*`.
- [ ] **NICE-01** After the MVP (D-10). Team members and invites (single owner only today).
- [ ] **NICE-02** Not done. Help center / docs page.
- [ ] **NICE-03** Not done. In-dashboard guided tour after onboarding (12 nav items, no guidance).

---

## Priority order

The order used during the build (audit date). Most of it is done; see the status table at the top.

1. `SEC-01` malware and key rotation. Do this before anyone runs `npm run dev` again.
2. `CORE-01`, `CORE-02`, `CORE-03`: make the core promise true.
3. `REL-01`, `REL-02`, `CORE-05` (scan cap part): cost and timeouts.
4. `SEC-02`, `SEC-03`: SSRF.
5. `REL-06`, `REL-07`, `GROW-01`: see errors and usage.
6. `BILL-01` to `BILL-04`, rest of `CORE-05`, `CORE-06`: before turning beta off.
7. `EMAIL-01`, `ACC-01` to `ACC-04`.
8. `OPS-01` to `OPS-06`, remaining `SEC-*`.
9. Everything else.

## Verification

Run before marking any task done:

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

After OPS-01 exists, also `npm test` and the Playwright suite.

For UI changes, drive the real flow in a browser (signup → onboarding → scan → dashboard) and check the Netlify function logs for errors.

## Notes for AI coding agents

- Read `AGENTS.md` first. This is Next.js 16: auth gating lives in `src/proxy.ts`, not `middleware.ts`. Check `node_modules/next/dist/docs/` before using a Next API from memory.
- `postcss.config.mjs` is clean (SEC-01); the git hooks scan every commit and push for the payload again.
- Supabase clients: `src/lib/supabase/server.ts` (user scoped, RLS applies) for user requests, `src/lib/supabase/service.ts` (service role) only in webhook, cron and admin code. Only a feature's `dal.ts` reads the database (MVP_SPEC 18.1).
- Plans, prices and credits come from MVP_SPEC 4 and the billing module; `src/config/pricing.ts` and `src/config/product-access.ts` are deleted.
- New SQL goes in a new numbered file in `supabase/migrations/`. Never edit an applied migration.
- One task per PR, with the task ID in the title.
