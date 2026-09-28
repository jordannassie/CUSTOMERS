# Bugs Found During the Build

Bugs found while building or verifying a task. Planned audit fixes (SEC-xx, CORE-xx and so on) stay in [MVP_ROADMAP.md](./MVP_ROADMAP.md).

## Rules

- Log every bug found during a task in that task's pull request, even when it is not fixed there.
- Severity: **High** blocks users or loses data (fix now, tell the team straight away). **Medium** is broken but has a workaround (fix in the next related task). **Low** is cosmetic (fix when the page is rebuilt).
- "Fix in" names the task that will fix it, or "now".
- When fixed, set Status to `Fixed (PR #)`. Do not delete rows.
- Never log security bugs here while the repo is public. Report them directly and keep them in the private handoff notes.

## Bugs

| ID | Found | Where | What the user sees | Severity | Fix in | Status |
|---|---|---|---|---|---|---|
| BUG-001 | 2026-09-26, B-03 verify | `/` at 390px | Page scrolls sideways; the hero dashboard preview is 16px too wide | Low | B-71 (homepage rebuild) | Fixed (PR #28) |
| BUG-002 | 2026-09-26, B-03 verify | Site header, mobile menu | "Agencies" appears twice ("Agencies & Resellers" and "Agencies") | Low | B-70 (marketing rebuild) | Open |
| BUG-003 | 2026-09-26, B-03 verify | `/contact` | Browser tab title repeats: "Contact \| Customers.Direct \| Customers.Direct" | Low | B-70 (marketing rebuild) | Open |
| BUG-004 | 2026-09-26, B-03 verify | `/dashboard/billing` at 390px | Page scrolls sideways; content is 57px too wide | Low | Phase 5 (billing pages) | Open |
| BUG-005 | 2026-09-26, B-04 | Live database (`wsxusvapciexemfvtadm`) | Migrations 009 and 017 were never applied: `seo_snapshots`, `billing_accounts`, `business_billing_items`, `usage_events` and `stripe_webhook_events` are missing, so the live billing page and SEO analysis cannot load their data. `customers-dev` has them. | Medium | Applied 2026-09-26 after a full backup | Fixed (applied to live 2026-09-26) |
| BUG-006 | 2026-09-26, B-04 | `/internal/admin/businesses` | List selected `city, region, country` columns that do not exist, so the query failed | Medium | B-04 | Fixed (B-04) |
| BUG-007 | 2026-09-26, B-04 | `/internal/admin/businesses/[id]` | Prompts list selected `prompt_text` (the column is `prompt`), and city, region, country and category read missing columns | Medium | B-04 | Fixed (B-04) |
| BUG-008 | 2026-09-26, B-04 | `/internal/admin/settings` | DataForSEO showed "not configured" because it checked `DATAFORSEO_LOGIN` while the code uses `DATAFORSEO_USERNAME` | Low | B-04 | Fixed (B-04) |
| BUG-009 | 2026-09-26, B-04 verify | `/login?next=...` (email and password) | After logging in, the user always lands on `/dashboard` instead of the page they asked for; only Google login honours `next` (`AuthForm.tsx:134`) | Low | B-15 (its "come back after logging in" result) | Fixed (PR #35) |
| BUG-010 | 2026-09-27, B-11 | `npm test` in parallel worktrees | Every worktree shares one local Supabase stack (`project_id = "customers-direct"` in `supabase/config.toml`), so a `db reset` in one session wipes the database under another session's tests (seen as a failed reset and a DB with no migrations). Workaround: rerun. | Medium | B-18 follow-up (per-worktree `project_id` and ports) | Fixed (PR #88, INFRA-01) |
| BUG-011 | 2026-09-26, B-71 verify | `/compare` | Browser tab title says "Customers.Direct" twice, and joins the parts with a long dash | Low | B-73 (compare tool rebuild) | Fixed (PR #53, title is now "AI readiness check", joined with a bar) |
| BUG-012 | 2026-09-26, B-71 verify | Chat widget on `/` at 390px | The "Hi! What can we help you with?" bubble covered the homepage "Compare free" button | Low | B-71 | Fixed (PR #28, bubble hidden on phones) |
| BUG-014 | 2026-09-27, B-17 verify | `/dashboard` against `customers-dev` | Every logged-in dashboard page fails with "Could not find the table 'public.agencies'": B-15's dashboard gate reads `agencies`, but migration `021_core_tables` was never applied to customers-dev. Workaround: run the app against the local database. | Medium | Leader (apply 021 and later to customers-dev) | Open |
| BUG-015 | 2026-09-27, B-71 review | Homepage hero at 390px (`mvp`) | The round chat button covers the hint text under "Compare free" | Low | Chat widget decision (F-13) | Open |
| BUG-016 | 2026-09-27, B-22 | Live site Perplexity checks (`src/lib/geo/providers/perplexity.ts` on `main`) | Perplexity retired the Sonar Chat Completions endpoint on 2026-09-27, so every Perplexity check on the live site fails from today | Medium | Fixed on `mvp` by B-26 (PR #52); live waits for a decision: hotfix `main` or wait for go-live | Open |
| BUG-017 | 2026-09-27, B-31 CI | CI Unit tests (`npm test`) | CI flake: a different DB test fails each run with "An invalid response was received from the upstream server", a 502 from the local Supabase gateway. `supabase db reset` recreates the db and auth containers while PostgREST and Kong keep running and reconnect. Once a Docker pull rate limit also failed the job. | Medium | B-31 | Fixed (PR #58: `test-db-reset.sh` waits for 5 straight 200s from REST and auth; `tests/setup/retry-gateway-502.ts` retries only that 502 once) |
| BUG-018 | 2026-09-26, B-71 | `/` (old homepage) | Site icons in the hero preview table loaded from Google's favicon service and showed as broken images | Low | B-71 | Fixed (PR #28, old homepage removed) |
| BUG-019 | 2026-09-27, B-68 verify | Every `/internal/admin/*` page in dev (seen on Settings and Usage) | The dev console shows "Route ... encountered uncached data during prerendering or a navigation" pointing at `AdminLayout`; pages still load and work. Likely the B-64 layout's Suspense placement under Cache Components. | Low | B-64 follow-up | Fixed (PR #62, a loading boundary in each admin page folder) |
| BUG-020 | 2026-09-27, B-66 verify | Any `/internal/admin/*` page opened by a signed-in non-admin in dev (seen on Settings, unchanged by B-66, and on Businesses) | Instead of landing on `/dashboard`, the tab ends on `/internal/admin` showing "Loading..." and keeps re-requesting it (about one request every 2 seconds). No admin data is shown. The redirect is thrown inside the B-64 layout's Suspense (`admin-frame.tsx`), where it streams instead of redirecting cleanly. | Medium | B-64 follow-up | Fixed (PR #62: the loop was BUG-021, a stale session; the admin check also runs in the layout before streaming now) |
| BUG-021 | 2026-09-27, BUG-020 fix verify | Any logged-in page after the user is deleted (seen when another session reset the local DB) | The browser bounces between the page and `/login` until it stops with "too many redirects": `proxy.ts` trusts the still-valid token (`getClaims()`) and sends `/login` back to `next`, while the page's `getUser()` finds no user and sends it to `/login`. | Medium | PR #62 | Fixed (PR #62, `proxy.ts` confirms the user with `getUser()` before sending them away from `/login`) |
| BUG-022 | 2026-09-27, B-29 | `npm test` full run | `src/modules/scanning/service.test.ts` ("serves a second business in the same city from the cache...", sometimes others) hits the 5 second default timeout in a full parallel run, also without B-29's test files; the file passes when run alone. Likely needs a longer timeout like the other DB-heavy files. | Low | B-26 follow-up | Open |
| BUG-023 | 2026-09-28, B-41 and B-52 | `scripts/test-db-reset.sh` | Fails with "API_URL: unbound variable" when `supabase status` runs before the stack is fully up. The status read should retry. | Medium | INFRA-01 follow-up | Open |
| BUG-024 | 2026-09-28, parallel workers | Shared local Supabase stack | A worker that runs `supabase stop` on the shared stack removes its Docker network and leaves the db stuck at "Created". Only a full stop and start fixes it. | Medium | INFRA-01 follow-up | Open |
| BUG-025 | 2026-09-28, B-51 | `src/modules/insights/insights-db.test.ts` | The test fails when a random UUID contains a forbidden run of digits | Low | INFRA-01 | Fixed (PR #88) |
| BUG-026 | 2026-09-28, B-67 | `src/modules/admin/usage-cost/usage-cost.test.ts` | The test cannot be rerun: its fixed 2020 window counts rows left over from the last run | Low | INFRA-01 | Fixed (PR #88) |
| BUG-027 | 2026-09-28, B-84 | `src/components/geo/AuthForm.tsx`, `src/components/PlatformIcon.tsx`, `src/config/pricing.ts`, `src/app/api/stripe/checkout/route.ts` | Old wording still mentions Gemini and a 14-day trial | Low | B-84 or the billing tasks | Open |
| BUG-028 | 2026-09-28, B-74 | `/icon` in dev | Returns 500 with "Input buffer contains unsupported image format" from `src/components/marketing/brand-icon` | Low | B-74 follow-up | Open |
| BUG-029 | 2026-09-28, B-38 | `/login` | The page shows two email fields for a moment while it loads | Low | B-38 follow-up | Open |
| BUG-030 | 2026-09-28, B-52 | Opportunities test data | The opportunity "Your website does not spell out what you offer" says it found no phone number. The title and the finding do not match, in the seed data or the rules text. | Low | B-52 follow-up | Open |
| BUG-031 | 2026-09-28, B-52 | End-to-end tests | They need the dev server started with `.env.test.local` and `WORKER_IN_PROCESS=true`. This is not written down anywhere. | Low | Docs | Open |
| BUG-032 | 2026-09-28, parallel workers | Docker on the developer's Mac | Other projects' stacks use about 2.7 GiB of the 7.8 GiB Docker VM, and five worker stacks need about 4 GiB. Ask the user before stopping other projects. | Medium | The user | Open |
| BUG-033 | 2026-09-28, INFRA-01 | `supabase start` | It can hang on a macOS keychain lookup (`security find-generic-password`). Killing the lookup lets it continue. | Low | INFRA-01 follow-up | Open |
| BUG-034 | 2026-09-28, B-41, B-43 and B-52 | `playwright.config.ts` | The web server uses `.env.local` (the remote dev database) instead of the worktree's `.env.test.local`, so workers start the server by hand | Medium | INFRA-01 follow-up | Open |
| BUG-035 | 2026-09-28, B-41 | `schedules.test.ts` | Can fail when another test file deletes a business during `enqueue_due_scans` (`scan_jobs_business_id_fkey`) | Low | Test follow-up | Open |
| BUG-036 | 2026-09-29, CI | `tests/e2e/admin-access.spec.ts:79` on mobile | Failed once in CI, then passed | Low | Watch | Open |

BUG-013 is not used: it was the same bug as BUG-010. BUG-018 to BUG-020 were BUG-010, BUG-015 and BUG-016 on `mvp` before the 2026-09-27 sync with `main`.
