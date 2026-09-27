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
| BUG-010 | 2026-09-27, B-11 | `npm test` in parallel worktrees | Every worktree shares one local Supabase stack (`project_id = "customers-direct"` in `supabase/config.toml`), so a `db reset` in one session wipes the database under another session's tests (seen as a failed reset and a DB with no migrations). Workaround: rerun. | Medium | B-18 follow-up (per-worktree `project_id` and ports) | Open |
| BUG-015 | 2026-09-27, B-71 review | Homepage hero at 390px (`mvp`) | The round chat button covers the hint text under "Compare free" | Low | Chat widget decision (F-13) | Open |
| BUG-016 | 2026-09-27, B-22 | Live site Perplexity checks (`src/lib/geo/providers/perplexity.ts` on `main`) | Perplexity retired the Sonar Chat Completions endpoint on 2026-09-27, so every Perplexity check on the live site fails from today | Medium | Fixed on `mvp` by B-26 (PR #52); live waits for a decision: hotfix `main` or wait for go-live | Open |
