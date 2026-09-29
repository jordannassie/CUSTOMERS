# Flags for review

Things the build could not settle on its own: checks that could not be run, decisions that need a person, and follow-ups. The leader session adds a row and keeps building; the team reviews this list together. Bugs go in [BUGS.md](../BUGS.md). Security items stay in the private notes while the repo is public and are listed here by ID only. [Back to index](./README.md)

| ID | Raised | Task | What needs a person | Status |
|---|---|---|---|---|
| F-01 | 2026-09-26 | B-09 (PR #21) | `/design-preview` has not been opened while logged in as an admin. The same component was checked from a temporary logged-out route at 1440 and 390, and logged-out visitors are redirected to login. Merged into `mvp` on that basis. Open it once with an admin account. | Settled (checked in the whole-product check on 2026-09-29, passes) |
| F-02 | 2026-09-26 | B-08 (PR #23) | Hosting test (D-41): logged-in dashboard and admin were not checked on the Netlify preview, because it uses the live database and needs a live test login. Everything else passed there. | Open |
| F-03 | 2026-09-26 | B-06 (PR #22) | Security item S-1 (private notes) needs a decision; it affects the live site. | Open |
| F-04 | 2026-09-26 | B-24 | Mention detection eval needs 150 to 200 real answers labelled by people (eval rule: labels are never generated). The code is merged (PR #32); the task stays open until the dataset exists. | Open |
| F-05 | 2026-09-27 | B-07 (PR #25) | Jordan must turn on branch protection for `main` and `mvp` (the working account has no admin rights). The "a PR with a type error is blocked" demo waits for this. | Open |
| F-06 | 2026-09-27 | B-07 (PR #25) | Add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` as repository secrets before the first AI-graded eval (B-51). Use the new keys from B-01, not the old ones. | Open |
| F-07 | 2026-09-27 | B-07 (PR #25) | Lint fixes touched the billing trial-days line and the admin accounts, leads and news screens. CI and logged-out checks pass, but nobody clicked through them logged in. | Settled (checked in the whole-product check on 2026-09-29, passes) |
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
| F-23 | 2026-09-27 | B-16 (PR #39) | The two entitlement messages are checked in tests only; recheck them in the app after B-29 (Run scan) and B-36 or B-44 (add business). | Settled (checked in the whole-product check on 2026-09-29, passes) |
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
| F-40 | 2026-09-28 | B-37 | The no-website businesses feature waits for Jordan to confirm it (D-08). | Open |
| F-41 | 2026-09-28 | B-72 (PR #78) | The pricing page says unused top-ups can be refunded within 14 days. Jordan or a lawyer must confirm this. | Open |
| F-42 | 2026-09-28 | B-72 (PR #78) | Apply migration 034 to staging and live before launch. | Open |
| F-43 | 2026-09-28 | B-45 | D-17 (100 trial credits) is still Proposed. B-45 must also decide whether a returning customer gets a second trial. | Open |
| F-44 | 2026-09-29 | B-44 (PR #90) | With a subscription schedule attached, a declined card leaves the subscription past due instead of rolling it back. Confirm this is fine. | Open |
| F-45 | 2026-09-29 | B-44 (PR #90) | `keepSubscription` (undo a cancel) was added beyond the task. Keep it or drop it. | Open |
| F-46 | 2026-09-29 | B-65 (PR #92) | Restoring an agency sets its status to canceled, so the owner picks a plan again. "Mark as real" is also allowed. Confirm both. | Open |
| F-47 | 2026-09-29 | B-65 (PR #92) | Apply migration 036 to customers-dev, staging and live before launch. B-77 must set `agencies.deleted_at`. | Open |
| F-48 | 2026-09-28 | B-41 (PR #84) | With real Stripe, the first scan may show "out of credits" for a moment if `invoice.paid` arrives after `checkout.session.completed`. Check this in the sandbox. | Settled (fixed by PR #106, the first scan waits for trial credits) |
| F-49 | 2026-09-28 | B-41 (PR #84), B-43 (PR #85) | Real Stripe test-card and webhook runs wait for the sandbox (B-01). Set `NEXT_PUBLIC_APP_URL` on Netlify so Stripe return URLs never come from request headers. | Open |
| F-50 | 2026-09-29 | B-58 (PR #89) | Delete `/dashboard/seo` once D-06 is decided. `/api/geo/visibility/run` still has no caller. Decide what to remove. `react-markdown` and `remark-gfm` were removed in PR #104. | Open |
| F-51 | 2026-09-28 | B-42 (PR #80) | The Stripe CLI check waits for the sandbox. The app key needs Subscriptions Read and Invoices Read. `credit_grants.business_id` is empty for plan grants. | Open |
| F-52 | 2026-09-28 | B-49 (PR #71) | The trend arrow compares the last 7 days with the 7 days before. Confirm. | Open |
| F-53 | 2026-09-28 | B-50 (PR #76) | A competitor added partway through the 30 days scores low until the window rolls over. Decide how to handle it. | Open |
| F-54 | 2026-09-28 | B-61 (PR #68) | Set `EMAIL_UNSUBSCRIBE_SECRET` and `EMAIL_FROM` on the Netlify mvp deploy. The domain DNS is F-12. | Open |
| F-55 | 2026-09-28 | B-33 (PR #69) | The question mix allows at most 4 of 12 questions per intent. Confirm. | Open |
| F-56 | 2026-09-28 | B-40 (PR #65) | Sandbox steps: a fresh sandbox, 2 restricted keys and Adaptive Pricing off. Then run the catalog scripts. | Open |
| F-57 | 2026-09-28 | B-36 (PR #72), B-41 (PR #84) | The onboarding wizard stores `?plan=` in `app_metadata.selected_plan`, and checkout reads it from there. Confirm. | Open |
| F-58 | 2026-09-28 | B-54 (PR #75) | The source type lists in `src/modules/sources/classify.ts` need a person to review them. | Open |
| F-59 | 2026-09-29 | B-62 (PR #99) | The weekly report email creates a public share link for every scored business that never turned one off (the plan asks for a share page link). Businesses exported to PDF fall back to a dashboard link. Confirm that creating public links automatically is OK. | Open |
| F-60 | 2026-09-29 | B-62 (PR #99) | Apply migration 038 and set the `email_jobs_url` Vault secret. Low credit emails can lag by up to 30 minutes. The trial ending amount leaves out discounts and tax. Confirm both. | Open |
| F-61 | 2026-09-28 | B-82 (PR #97) | Three security follow-ups from B-82 need a decision. Details stay in the private notes while the repo is public. | Open |
| F-62 | 2026-09-28 | B-46 (PR #93) | The billing portal uses Stripe's default portal setup (branding is set in the Stripe dashboard). The real portal and plan changes are untested until the sandbox exists. | Open |
| F-63 | 2026-09-28 | B-69 (PR #96) | Migration 037 drops and re-adds the `email_log.type` check to allow `system_alert` (wider, no data change). Hosts need the Vault secret `system_alerts_url` and `ALERT_DAILY_COST_USD`. Only AI check failures write `provider_errors` for now. | Open |
| F-64 | 2026-09-28 | B-69 (PR #96) | Test agencies count toward alerts. Keep them in or leave them out? | Open |
| F-65 | 2026-09-29 | E2E-0929 (PR #108) | A share link that is turned off or unknown now answers 404, not 410 (a Next page cannot return 410). `/r/*` already sends noindex. Confirm. | Open |
| F-66 | 2026-09-29 | E2E-0929 (PR #108) | Jobs do not record who started them, so admin scans now use priority 101: an admin rescan goes ahead of an earlier Run scan from another business. Admin scans saved before this show "Run from the app". Confirm. | Open |
| F-67 | 2026-09-29 | E2E-0929 (PR #108) | Questions that onboarding saved as "custom" before this fix keep the "Added by you" badge on the live database until they are updated. Decide whether to update them. | Open |
| F-68 | 2026-09-29 | E2E-0929 (PR #108, PR #109) | Apply migrations 040 and 041 to customers-dev, staging and live before launch, with 036 to 039. | Open |
