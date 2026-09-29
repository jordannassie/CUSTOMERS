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
| BUG-001 | 2026-09-26, B-03 verify | `/` at 390px | Page scrolls sideways; the hero dashboard preview is 16px too wide | Low | B-70 (homepage rebuild) | Open |
| BUG-002 | 2026-09-26, B-03 verify | Site header, mobile menu | "Agencies" appears twice ("Agencies & Resellers" and "Agencies") | Low | B-70 (marketing rebuild) | Open |
| BUG-003 | 2026-09-26, B-03 verify | `/contact` | Browser tab title repeats: "Contact \| Customers.Direct \| Customers.Direct" | Low | B-70 (marketing rebuild) | Open |
| BUG-004 | 2026-09-26, B-03 verify | `/dashboard/billing` at 390px | Page scrolls sideways; content is 57px too wide | Low | Phase 5 (billing pages) | Open |
| BUG-005 | 2026-09-26, B-04 | Live database (`wsxusvapciexemfvtadm`) | Migrations 009 and 017 were never applied: `seo_snapshots`, `billing_accounts`, `business_billing_items`, `usage_events` and `stripe_webhook_events` are missing, so the live billing page and SEO analysis cannot load their data. `customers-dev` has them. | Medium | Applied 2026-09-26 after a full backup | Fixed (applied to live 2026-09-26) |
| BUG-006 | 2026-09-26, B-04 | `/internal/admin/businesses` | List selected `city, region, country` columns that do not exist, so the query failed | Medium | B-04 | Fixed (B-04) |
| BUG-007 | 2026-09-26, B-04 | `/internal/admin/businesses/[id]` | Prompts list selected `prompt_text` (the column is `prompt`), and city, region, country and category read missing columns | Medium | B-04 | Fixed (B-04) |
| BUG-008 | 2026-09-26, B-04 | `/internal/admin/settings` | DataForSEO showed "not configured" because it checked `DATAFORSEO_LOGIN` while the code uses `DATAFORSEO_USERNAME` | Low | B-04 | Fixed (B-04) |
| BUG-009 | 2026-09-26, B-04 verify | `/login?next=...` (email and password) | After logging in, the user always lands on `/dashboard` instead of the page they asked for; only Google login honours `next` (`AuthForm.tsx:134`) | Low | B-15 (its "come back after logging in" result) | Open |
| BUG-010 | 2026-09-27, B-11 | `npm test` in parallel worktrees | Every worktree shares one local Supabase stack (`project_id = "customers-direct"` in `supabase/config.toml`), so a `db reset` in one session wipes the database under another session's tests (seen as a failed reset and a DB with no migrations). Workaround: rerun. | Medium | B-18 follow-up (per-worktree `project_id` and ports) | Fixed (PR #88, INFRA-01) |
| BUG-015 | 2026-09-27, B-71 review | Homepage hero at 390px (`mvp`) | The round chat button covers the hint text under "Compare free" | Low | Chat widget decision (F-13) | Open |
| BUG-016 | 2026-09-27, B-22 | Live site Perplexity checks (`src/lib/geo/providers/perplexity.ts` on `main`) | Perplexity retired the Sonar Chat Completions endpoint on 2026-09-27, so every Perplexity check on the live site fails from today | Medium | Fixed on `mvp` by B-26 (PR #52); live waits for a decision: hotfix `main` or wait for go-live | Open |
| BUG-023 | 2026-09-28, B-41 and B-52 | `scripts/test-db-reset.sh` | Fails with "API_URL: unbound variable" when `supabase status` runs before the stack is fully up. The status read should retry. | Medium | INFRA-01 follow-up | Fixed (PR #100) |
| BUG-024 | 2026-09-28, parallel workers | Shared local Supabase stack | A worker that runs `supabase stop` on the shared stack removes its Docker network and leaves the db stuck at "Created". Only a full stop and start fixes it. | Medium | INFRA-01 follow-up | Open |
| BUG-025 | 2026-09-28, B-51 | `src/modules/insights/insights-db.test.ts` | The test fails when a random UUID contains a forbidden run of digits | Low | INFRA-01 | Fixed (PR #88) |
| BUG-026 | 2026-09-28, B-67 | `src/modules/admin/usage-cost/usage-cost.test.ts` | The test cannot be rerun: its fixed 2020 window counts rows left over from the last run | Low | INFRA-01 | Fixed (PR #88) |
| BUG-027 | 2026-09-28, B-84 | `src/components/geo/AuthForm.tsx`, `src/components/PlatformIcon.tsx`, `src/config/pricing.ts`, `src/app/api/stripe/checkout/route.ts` | Old wording still mentions Gemini and a 14-day trial | Low | B-84 or the billing tasks | Open |
| BUG-028 | 2026-09-28, B-74 | `/icon` in dev | Returns 500 with "Input buffer contains unsupported image format" from `src/components/marketing/brand-icon` | Low | B-74 follow-up | Fixed (PR #100) |
| BUG-029 | 2026-09-28, B-38 | `/login` | The page shows two email fields for a moment while it loads | Low | B-38 follow-up | Fixed (PR #100) |
| BUG-030 | 2026-09-28, B-52 | Opportunities test data | The opportunity "Your website does not spell out what you offer" says it found no phone number. The title and the finding do not match, in the seed data or the rules text. | Low | B-52 follow-up | Fixed (PR #100) |
| BUG-031 | 2026-09-28, B-52 | End-to-end tests | They need the dev server started with `.env.test.local` and `WORKER_IN_PROCESS=true`. This is not written down anywhere. | Low | Docs | Fixed (PR #100) |
| BUG-032 | 2026-09-28, parallel workers | Docker on the developer's Mac | Other projects' stacks use about 2.7 GiB of the 7.8 GiB Docker VM, and five worker stacks need about 4 GiB. Ask the user before stopping other projects. | Medium | The user | Open |
| BUG-033 | 2026-09-28, INFRA-01 | `supabase start` | It can hang on a macOS keychain lookup (`security find-generic-password`). Killing the lookup lets it continue. | Low | INFRA-01 follow-up | Open |
| BUG-034 | 2026-09-28, B-41, B-43 and B-52 | `playwright.config.ts` | The web server uses `.env.local` (the remote dev database) instead of the worktree's `.env.test.local`, so workers start the server by hand | Medium | INFRA-01 follow-up | Fixed (PR #100) |
| BUG-035 | 2026-09-28, B-41 | `schedules.test.ts` | Can fail when another test file deletes a business during `enqueue_due_scans` (`scan_jobs_business_id_fkey`) | Low | Test follow-up | Open |
| BUG-036 | 2026-09-29, CI | `tests/e2e/admin-access.spec.ts:79` on mobile | Failed once in CI, then passed | Low | Watch | Open |
| BUG-037 | 2026-09-29, B-62 | `competitors-db.test.ts` | The test's pattern can match digits inside a random UUID, so it can fail at random | Low | Test follow-up | Open |
| BUG-038 | 2026-09-29, B-62 | `overview.test.ts` | The test counts trialing agencies made by other test files running at the same time, so it can fail at random | Low | Test follow-up | Open |
| BUG-039 | 2026-09-28, B-82 | Design preview palette, admin scans and admin usage by day | The class `text-hint` is used in 5 files, but the utility is `text-text-hint`, so the hint colour is missing | Low | Bug batch | Fixed (PR #100) |
| BUG-040 | 2026-09-28, B-46 | `/settings/billing` when past due | The payment failed message shows twice (app banner and page callout) | Low | Bug batch | Fixed (PR #100) |
| BUG-041 | 2026-09-28, B-69 | `tprep.sh` (leader tooling) | It cloned an incomplete `node_modules` into a worktree (TypeScript missing files, no `.bin`), likely from a source worktree in the middle of `npm ci`. It should check the source is complete first. | Low | Leader tooling | Open |
| BUG-042 | 2026-09-28, B-59 and B-69 | `scripts/check-auth-calls.ts` | Its public route list must be updated for every new public route, or the check fails. Worker briefs should say so. | Low | Worker brief | Open |
