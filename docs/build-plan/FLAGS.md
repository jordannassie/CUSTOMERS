# Flags for review

Things the build could not settle on its own: checks that could not be run, decisions that need a person, and follow-ups. The leader session adds a row and keeps building; the team reviews this list together. Bugs go in [BUGS.md](../BUGS.md). Security items stay in the private notes while the repo is public and are listed here by ID only. [Back to index](./README.md)

| ID | Raised | Task | What needs a person | Status |
|---|---|---|---|---|
| F-01 | 2026-09-26 | B-09 (PR #21) | `/design-preview` has not been opened while logged in as an admin. The same component was checked from a temporary logged-out route at 1440 and 390, and logged-out visitors are redirected to login. Merged into `mvp` on that basis. Open it once with an admin account. | Open |
| F-02 | 2026-09-26 | B-08 (PR #23) | Hosting test (D-41): logged-in dashboard and admin were not checked on the Netlify preview, because it uses the live database and needs a live test login. Everything else passed there. | Open |
| F-03 | 2026-09-26 | B-06 (PR #22) | Security item S-1 (private notes) needs a decision; it affects the live site. | Open |
| F-04 | 2026-09-26 | B-24 | Mention detection eval needs 150 to 200 real answers labelled by people (eval rule: labels are never generated). The code is merged (PR #32); the task stays open until the dataset exists. | Open |
| F-05 | 2026-09-27 | B-07 (PR #25) | Jordan must turn on branch protection for `main` and `mvp` (the working account has no admin rights). The "a PR with a type error is blocked" demo waits for this. | Open |
| F-06 | 2026-09-27 | B-07 (PR #25) | Add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` as repository secrets before the first AI-graded eval (B-51). Use the new keys from B-01, not the old ones. | Open |
| F-07 | 2026-09-27 | B-07 (PR #25) | Lint fixes touched the billing trial-days line and the admin accounts, leads and news screens. CI and logged-out checks pass, but nobody clicked through them logged in. | Open |
| F-08 | 2026-09-27 | B-07 (PR #25) | The worker made one local, never-pushed commit with git hooks turned off during a trial build; it scanned the code by hand (clean) and reported it. Worker briefs now forbid this outright. | Open |
| F-09 | 2026-09-27 | B-10 (PR #27) | Data API grants: live gives every public table to the anon and authenticated roles by default; local copies this with `auto_expose_new_tables`, which the Supabase CLI removes on 2026-10-30. Decide: write the grants into a migration, or revoke them on live. Decide before 2026-10-30. | Open |
| F-10 | 2026-09-27 | B-10 (PR #27) | Migration 015 (safer signup trigger) never ran on live, and `020_live_baseline.sql` restores live's older trigger on fresh databases. Decide whether to reapply 015's version in a new migration. | Open |
| F-11 | 2026-09-27 | B-10 (PR #27) | Go-live: live has no migration history. Run the migration repair in `supabase/migrations/README.md` (after a backup) before the first push to live. Belongs in the B-80 checklist. | Open |
| F-12 | 2026-09-27 | B-61 | Needs Jordan's DNS access to verify the sending domain in Resend. B-61 also waits for B-11 (agencies table). | Open |
| F-13 | 2026-09-27 | B-71 (PR #28) | The chat widget keeps its old styling; its greeting is hidden under 640px (BUG-012). Restyle it or remove it? | Open |
| F-14 | 2026-09-27 | B-71 (PR #28) | The homepage pricing section shows no numbers until the `plans` table has Jordan's final prices (D-21). Wire real plan rows in B-72. | Open |
| F-15 | 2026-09-27 | B-24 (PR #32) | The generic-name rule (city within 200 characters or in the same list item) is a first guess; tune it against the labelled set. The no-website rule fires only when `has_website` is explicitly false. | Open |
| F-16 | 2026-09-27 | B-32 | The question library is drafted by Claude Sonnet and needs a person to review about 40 templates per industry. Waits for new API keys (B-01) and a reviewer. | Open |
| F-17 | 2026-09-27 | B-40 | Stripe setup needs Jordan's live account and final prices (D-21, D-40). | Open |
| F-18 | 2026-09-27 | B-15 (PR #35) | Security item S-2 (private notes), high, affects the live site. Fixed on `mvp` by B-17 (PR #37); the live site needs a decision now. | Open |
| F-19 | 2026-09-27 | B-13 (PR #36) | Confirm storing a negative balance (overdraft) in `agencies.credit_overdraft`. | Open |
| F-20 | 2026-09-27 | B-13 (PR #36) | Top-ups spendable only with an active plan or trial: now enforced by `canSpendTopUps` in B-16 (PR #39), checked before every hold. | Settled |
| F-21 | 2026-09-27 | B-16 (PR #39) | A business with no plan yet gets Starter limits. Confirm this is right for onboarding. | Open |
| F-22 | 2026-09-27 | B-16 (PR #39) | Adding a business is also blocked for agencies that are past due, cancelled or suspended, not only trials at 2 businesses. Confirm. | Open |
| F-23 | 2026-09-27 | B-16 (PR #39) | The two entitlement messages are checked in tests only; recheck them in the app after B-29 (Run scan) and B-36 or B-44 (add business). | Open |
| F-24 | 2026-09-27 | B-14 (PR #40) | The Supabase CLI login no longer sees customers-dev (only live). Run `supabase login` with your own-org account so workers can apply migrations 024 and 025 there. | Open |
| F-25 | 2026-09-27 | B-14 (PR #40) | The audit test account from 2026-09-23 no longer exists on live, so its Brandastic business cannot be kept. The other live test account was also marked `is_test`. | Open |
| F-26 | 2026-09-27 | B-14 (PR #40) | Moved agencies start as trialing with no end date and 0 credits until Jordan decides the beta-user treatment (D-69, B-81). | Open |
| F-27 | 2026-09-27 | B-14 (PR #40) | 7 existing profiles have no name, so their agencies are named after their email domain (for example "gmail.com"). A friendlier rule may be wanted. | Open |
| F-28 | 2026-09-27 | B-34 | Business auto-fill needs new Firecrawl, Google Places and Claude keys (B-01) plus 30 to 50 businesses labelled by a person. | Open |
| F-29 | 2026-09-27 | B-20 | The adapter is tested with recorded answers only; the real "coffee shop in Orange, CA" check waits for new API keys (B-01). | Open |
| F-30 | 2026-09-27 | B-21, B-26 | An answer where every web search failed counts as a failed check and is not charged. | Settled (B-26, PR #52) |
| F-31 | 2026-09-27 | B-22 (PR #46) | Perplexity retired Sonar Chat Completions on 2026-09-27; the adapter uses the Agent API (model `perplexity/sonar`). On the Agent API the model decides whether to search; the first live call must confirm it searches for local questions. New prices: $0.25 in and $2.50 out per 1M tokens, $0.0025 per search. Confirm the switch. | Open |
| F-32 | 2026-09-27 | B-64 (PR #45) | D-35 (admin menu and actions) is still Proposed, but B-17 and B-64 were built on it. Confirm D-35. | Open |
| F-33 | 2026-09-27 | B-25 (PR #49) | The plan says the extraction eval runs on every PR, but the model run is a paid call per answer. The model run now runs only when a prompt, model or eval changes; the free grader runs on every PR. Confirm. | Open |
| F-34 | 2026-09-27 | B-55 (PR #50) | `businesses` has no address column, so the settings form has no address (needs a migration task). Industry is free text (no fixed list yet). | Open |
| F-35 | 2026-09-27 | B-73 (PR #53) | New decision D-83 (free tool becomes an AI readiness check, no AI calls) is Proposed. Confirm. | Open |
| F-36 | 2026-09-27 | B-30 (PR #55) | "Real change" and competitor standing use the combined margin of both numbers, stricter than one margin. Confirm. A renamed competitor loses its history. | Open |
| F-37 | 2026-09-27 | B-27 (PR #54) | Real hosting test (3 models, 12 questions on a Netlify preview) waits for new keys (B-01). Set `WORKER_SECRET`, `WORKER_TIME_BUDGET_SECONDS` and `WORKER_URL` on the mvp staging deploy, and the two Vault secrets on customers-dev, by hand. | Open |
| F-38 | 2026-09-27 | B-67 (PR #60) | The margin check uses the cheapest plan price per credit (Pro, about $0.0996) and warns under 50%, while D-23 plans about 70%. Confirm thresholds; top-up prices are not in the database yet (D-22). | Open |
| F-39 | 2026-09-27 | B-28 | Batch name extraction for scheduled scans (D-74, half price) is not built; it needs its own task (batch-id table, scheduled scans skip live extraction, collector job). | Open |
