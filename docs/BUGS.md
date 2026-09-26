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
| BUG-005 | 2026-09-26, B-04 | Live database (`wsxusvapciexemfvtadm`) | Migrations 009 and 017 were never applied: `seo_snapshots`, `billing_accounts`, `business_billing_items`, `usage_events` and `stripe_webhook_events` are missing, so the live billing page and SEO analysis cannot load their data. `customers-dev` has them. | Medium | Needs approval to apply migrations to the live database (back up first, D-43) | Open |
| BUG-006 | 2026-09-26, B-04 | `/internal/admin/businesses` | List selected `city, region, country` columns that do not exist, so the query failed | Medium | B-04 | Fixed (B-04) |
| BUG-007 | 2026-09-26, B-04 | `/internal/admin/businesses/[id]` | Prompts list selected `prompt_text` (the column is `prompt`), and city, region, country and category read missing columns | Medium | B-04 | Fixed (B-04) |
| BUG-008 | 2026-09-26, B-04 | `/internal/admin/settings` | DataForSEO showed "not configured" because it checked `DATAFORSEO_LOGIN` while the code uses `DATAFORSEO_USERNAME` | Low | B-04 | Fixed (B-04) |
