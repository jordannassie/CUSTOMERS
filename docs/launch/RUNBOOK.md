# Go-live runbook (Netlify path)

Step by step checklist for going live (B-80) and the launch rehearsal (B-83), on Netlify as decided in D-41. Plan: MVP_SPEC 20, D-70. Written 2026-10-01 from the code on `mvp`; updated 2026-11-19 for `release/go-live` (pull request #157 into `main`) after a full rehearsal on a copy of live (step 4).

**Order matters (checked 2026-11-19).** The old site on `main` cannot run on the migrated database: 047 removes the direct writes it makes with the customer's own login, and 082 hides `visibility_results.cost_usd`, so its reads of answers fail. Push the migrations and publish the new site together (step 9), and plan a rollback as a database restore (step 12).

Each step says who does it: **Dev** (the developer), **Jordan**, or **Both**. Tick each box as you go and write the time next to it. Never paste a key or secret into this file, a pull request, a chat or a ticket. Values live in the password manager (B-01).

Live Supabase project: `wsxusvapciexemfvtadm`. Production domain: `customers.direct`. In the SQL below, `<domain>` means `customers.direct`.

## 0. Before the day

- [ ] **Jordan**: every key replaced (B-01, SEC-01). The old ones are treated as exposed.
- [ ] **Jordan**: Stripe live account ready in his LLC (D-40), final prices confirmed (D-21, D-22), tax registration answered (MVP_SPEC 11.2).
- [ ] **Jordan**: decisions still open in DECISIONS.md "Ask Jordan" answered, including beta users (D-69, B-81), Terms and Privacy (D-78), and Places terms (D-73, see `places-compliance.md`).
- [ ] **Jordan**: who controls DNS for `customers.direct`, and access for the email records (F-12).
- [x] **Dev**: `release/go-live` has every task; CI, evals and the build green on pull request #157 (2026-11-19, Next.js 16.4.6).
- [x] **Dev**: deploy preview 157 tested logged in, customer and admin, at 1440px and 390px (2026-11-19).
- [ ] **Both**: pick a quiet time. Tell existing users if B-81 says so.

## 1. Environment variables (Netlify, production context)

Set in Netlify: Site configuration, Environment variables, scope "Production". Names only here. **Dev** sets them; **Jordan** supplies the ones from accounts only he controls.

Required, or the build fails:

| Name | What it is for | Comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project address (also allowed in the security headers) | Supabase, live project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key for signed-in pages | Supabase, live project API keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Server key for the worker, webhooks and admin | Supabase, live project API keys |
| `NEXT_PUBLIC_SITE_URL` | Address used for login, email and Stripe links (`https://<domain>`). If unset, Netlify's site address fills it at build time: the primary domain on the live site, the deploy's address on previews. A live build without an https address fails (BUG-283) | Our domain, or Netlify's primary domain |
| `NEXT_PUBLIC_APP_URL` | Same, and wins over `NEXT_PUBLIC_SITE_URL`: Stripe return pages, email links and the PDF (F-49). Same value, filled the same way | Our domain, or Netlify's primary domain |

Needed in production (the build passes without them, but a feature breaks):

| Name | What it is for | Comes from |
|---|---|---|
| `OPENAI_API_KEY` | ChatGPT checks, admin news | OpenAI |
| `ANTHROPIC_API_KEY` | Claude checks, explanations | Anthropic |
| `PERPLEXITY_API_KEY` | Perplexity checks | Perplexity |
| `GOOGLE_PLACES_API_KEY` | Onboarding pre-fill, competitor suggestions, Google signals | Google Cloud |
| `FIRECRAWL_API_KEY` | Reads the business website in onboarding | Firecrawl |
| `STRIPE_SECRET_KEY` | Stripe app key, restricted, live mode | Stripe (Jordan's account) |
| `STRIPE_WEBHOOK_SECRET` | Checks webhook signatures | Stripe, live webhook endpoint |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Card form and top-ups in the browser | Stripe, live mode |
| `STRIPE_PORTAL_CONFIGURATION` (optional) | The live Customer Portal settings to open (`bpc_...`). Save the portal settings in live mode first, or the portal errors | Stripe, Settings, Billing, Customer portal |
| `RESEND_API_KEY` | Sends email, sending only key | Resend |
| `EMAIL_FROM` | Sender, for example `Customers.Direct <hello@mail.customers.direct>` | Resend, verified domain |
| `EMAIL_UNSUBSCRIBE_SECRET` | Signs unsubscribe links, at least 32 characters. Changing it breaks old links | Make one (random) |
| `WORKER_SECRET` | Shared secret for the worker, alerts and email jobs. Must equal Vault `scan_worker_secret` | Make one (random) |
| `WORKER_URL` | Starts the worker at once on "Run scan" (`https://<domain>/.netlify/functions/scan-worker-background`) | Our domain |
| `ADMIN_EMAILS` | Comma separated admin emails; the only source of admin access | Jordan |

Optional:

| Name | What it is for | Default |
|---|---|---|
| `ALERT_DAILY_COST_USD` | Alert when the day's AI cost passes this amount (F-63) | Off |
| `WORKER_TIME_BUDGET_SECONDS` | How long one worker run keeps taking jobs | 600 |
| `OPENAI_NEWS_MODEL` | Model for admin news | `gpt-4o` |
| `NAME_EXTRACTION_BATCH` | `true`: scheduled scans read business names through Anthropic's Message Batches at half price (F-39, migration 097); names arrive on a later worker run, mentions use text detection until then. Turn on only after a watched trial night | Off |
| `DELETION_WAIT_DAYS` | Days before a deleted account or business is removed for good (B-77). The Privacy page shows this number | 30 |
| `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY` | Old pricing config only; real price IDs live in the `plans` table | Unset |

Must NOT be set in production (test and local only): `PLACES_FIXTURES`, `ONBOARDING_FIXTURES`, `STRIPE_CHECKOUT_FIXTURES`, `WORKER_IN_PROCESS`, `CHROMIUM_PATH`. The fixture flags are ignored in production anyway.

Old names from the previous app (`ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `GEO_CRON_SECRET`): the new app does not read them. Leave them until the rollback window in step 11 ends, then delete them.

Production on 2026-11-19 (names read with the Netlify CLI) still lacks: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Jordan, step 7), `WORKER_SECRET`, `EMAIL_UNSUBSCRIBE_SECRET` (make new random ones; never reuse the preview's), `ADMIN_EMAILS` (set for previews only), `EMAIL_FROM` (step 11). `WORKER_URL` and the AI, Places, Firecrawl and Resend keys are set.

- [ ] **Dev**: all "required" and "needed" names set for Production. Check the list against `src/lib/env.ts`.
- [ ] **Dev**: none of the "must not" names set for Production.

## 2. Back up live

Backup plan and restore steps: `BACKUPS.md` (proposal, needs Jordan's approval).

- [ ] **Dev**: with the user's approval, take the dumps from a scratch folder linked to live, never the repo (keep them out of git, folder mode 700). The CLI's login makes a temporary database role, so no database password is needed:

```
supabase link --project-ref wsxusvapciexemfvtadm --workdir <scratch>
supabase db dump --linked --workdir <scratch> -f live-schema.sql
supabase db dump --linked --workdir <scratch> --data-only --use-copy -f live-data.sql   # includes auth.users
supabase db dump --linked --workdir <scratch> --role-only -f live-roles.sql
```

First backup taken 2026-11-19 (schema, data with the 20 logins, roles, plus a JSON copy of every table) in `~/customers-live-backups/2026-11-19/` on the developer's machine. Take a fresh one right before the push.

- [ ] **Dev**: note the row counts for the move check: `npm run verify:migration -- --linked --baseline --save before.json`.
- [ ] **Jordan**: confirm a Supabase dashboard backup exists for today (Database, Backups).
- [ ] **Dev**: copy the logo buckets (`BACKUPS.md`, "Weekly copy of logos"). Database backups do not include Storage files.

## 3. Repair migration history (F-11)

Live had migrations 001 to 020 applied by hand, so it has no migration history. Without this the CLI would try to run them again.

- [ ] **Dev**: after the backup, with approval:

```
supabase migration repair --linked --status applied 001 002 003 004 005 006 007 008 009 010 011 012 013 014 015 016 017 018 019 020
```

- [ ] **Dev**: `supabase migration list --linked` shows 001 to 020 applied on remote and 021 to 098 not applied. `npm run db:drift` shows no drift for 001 to 020 (see `supabase/migrations/README.md`, Baseline).

Checked 2026-11-19: live has no migration history table, no `pg_cron` or `pg_net`, an empty Vault, and none of main's tables (`video_ad_orders`, `directory_apps`, `app_reviews`, `newsletter_events`). So the 024 to 029 repair in `supabase/migrations/README.md` is not needed: 071 to 076 run like the rest.

## 4. Apply migrations 021 to 098

`supabase db push` applies them in order and stops at the first error. They do not all leave the old site working (see the top), so run this inside step 9, not days before.

**Rehearsed 2026-11-19** on a throwaway local Supabase stack loaded with the live dump: repair 001 to 020, `db push --dry-run` listed the 78 files 021 to 098, and the push applied all 78 with no error. After it: 20 users, 20 profiles, 20 agencies (19 real, 1 `is_test`), 18 businesses, all with an agency; questions, answers and competitors unchanged; no table without RLS; no function open to anon or authenticated; 12 cron jobs. Existing accounts opened every page on the new app with no errors.

What existing customers get from the backfill (025): every agency is `trialing` with no trial end date and 0 credits. They see their saved results but cannot run a scan until the beta users decision (D-69, B-81) gives them credits or a plan.

- [ ] **Dev**: `supabase db push --linked` (applies 021 to 098).
- [ ] **Dev**: checks after the push:
  - `supabase migration list --linked` shows 021 to 098 applied.
  - 025 moved existing users: `npm run verify:migration -- --linked --compare before.json --save after.json` passes (counts match, every business has an agency).
  - 029 made the pg_cron jobs: see step 6.
  - 034 made `topup_packs`: continue with step 7 (Stripe catalog sync).
  - 035: `npm run db:types` against live gives an empty diff.
  - `npm run check:rls` passes and `select tablename from pg_tables where schemaname = 'public' and not rowsecurity;` returns no rows.
  - `scripts/check-function-grants.sql` returns no rows (091).
  - `select has_table_privilege('service_role', 'public.scan_jobs', 'select');` is true (094).
- [ ] **Dev**: if a migration fails, stop. Do not retry by hand. Read the error, fix it in a new migration on a branch, and restore from step 2 only if data was damaged.
- [ ] **Dev**: the question library is not in a migration. Seed it with `npm run question-library:seed` against live (approval needed), then `select count(*) from question_library;`. Until then onboarding still works with questions the AI writes.
- [ ] **Dev**: run `supabase/cleanup/places-cleanup.sql` (step 1 preview, then step 2) with approval (B-79, `places-compliance.md`).

## 5. Supabase Vault secrets

The pg_cron jobs read these. Set once in the live SQL editor (the commands are in `supabase/migrations/README.md`, "Worker URL and secret"). Names only here.

| Vault name | Value | Read by |
|---|---|---|
| `scan_worker_url` | `https://<domain>/.netlify/functions/scan-worker-background` | `call_scan_worker()` (029) |
| `scan_worker_secret` | Same value as `WORKER_SECRET` in Netlify | `call_scan_worker()` (029), `run_system_alerts()` (037), `run_email_job()` (038) |
| `system_alerts_url` | `https://<domain>/api/alerts/check` | `run_system_alerts()` (037) |
| `email_jobs_url` | `https://<domain>/api/email/jobs` | `run_email_job()` (038) |

- [ ] **Dev**: create all four with `vault.create_secret`. Until the merge in step 9, the production address still runs the old app, so the calls fail and nothing is scanned. That is safe; queued jobs wait.
- [ ] **Dev**: `select name from vault.secrets order by name;` lists the four names.

## 6. pg_cron jobs that must be running

All times UTC. Check with `select jobname, schedule, active from cron.job order by jobname;`. There must be 12 active jobs (the rehearsal made exactly these):

| Job | When | Does |
|---|---|---|
| `call-scan-worker` | every minute | Calls the worker when a scan job is waiting |
| `check-system-alerts` | every 15 minutes | Checks for problems and emails the admins |
| `email-low-credits` | every 30 minutes | Low credit emails |
| `email-price-changes` | hourly at :20 | Price change notices |
| `release-orphan-holds` | every 10 minutes, at :05 | Releases credit holds left by scans that never started |
| `email-weekly-report` | Mondays, every 15 minutes, 13:00 to 17:45 | Weekly report emails |
| `enqueue-due-scans` | 02:00 daily | Queues scheduled scans (test agencies only until step 10) |
| `expire-grants` | 01:00 daily | Expires old credit grants |
| `purge-cron-history` | 03:30 daily | Deletes cron history older than 14 days |
| `purge-deleted-accounts` | 03:45 daily | Removes deleted accounts and businesses once their wait has passed (042) |
| `purge-rate-limit-hits` | hourly at :15 | Deletes old rate limit rows |
| `reset-stuck-jobs` | every 10 minutes | Frees jobs stuck in "running" |

- [ ] **Dev**: all 12 present and active. `enqueue-due-scans` runs `enqueue_due_scans(false)`: test agencies only, so no real AI money is spent until step 10.

## 7. Stripe live switch

Details: `src/modules/billing/README.md`, "First-time setup" and "Live".

- [ ] **Jordan**: in live mode, turn Adaptive Pricing off (Settings, Adaptive Pricing).
- [ ] **Jordan**: create two restricted live keys: the catalog key (Products Write, Prices Write, used only by the sync script, never in Netlify) and the app key (`STRIPE_SECRET_KEY`, permissions listed in the billing README).
- [ ] **Both**: confirm prices in `plans` and `topup_packs` on live match D-21 and D-22.
- [ ] **Dev**: with `.env.local` pointed at live and approval, run the catalog sync with the live catalog key: dry run, then `APPLY=1`, then `npm run stripe:catalog-check` must pass (add `STRIPE_LIVE=1`; the script refuses a sandbox key on live).
- [ ] **Jordan**: add the live webhook endpoint `https://<domain>/api/stripe/webhook` with exactly these 9 events: `charge.refunded`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`. Give the signing secret to the developer for `STRIPE_WEBHOOK_SECRET`.
- [ ] **Dev**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Netlify are the live ones (`rk_live_`, `pk_live_`).

## 8. Supabase Auth and Google login

- [ ] **Dev**: Supabase dashboard (live), Authentication, URL configuration: Site URL `https://<domain>`. Redirect URLs include `https://<domain>/auth/callback` and `https://<domain>/reset-password` (the reset link uses the page's own address). Add the `www` address too if the site answers on it.
- [ ] **Jordan** (owner of the Google Cloud project): the Google OAuth client's authorized redirect URI is the Supabase callback `https://wsxusvapciexemfvtadm.supabase.co/auth/v1/callback`, and the authorized JavaScript origin includes `https://<domain>`.
- [ ] **Dev**: Supabase Auth, Google provider enabled with that client.
- [ ] **Dev** (or Jordan): Supabase Auth, Providers, Email, Password requirements: minimum length 8, "Lowercase, uppercase letters, digits and symbols", and "Prevent use of leaked passwords" on. This matches the app's rule (`src/lib/password-rules.ts`); without it the rule holds only in our forms, not for someone calling Supabase Auth directly.
- [ ] **Both**: decide who sends Supabase's own emails (confirm signup, reset password). Today they use Supabase's built in sender, which is not meant for production volume. Suggest custom SMTP through Resend. Open question.

## 9. Deploy: merge `release/go-live` into `main`, with the migrations

Pull request #157. `release/go-live` already has everything from `main` (0 behind on 2026-11-19); check again on the day. This order keeps the time the site is broken to the few minutes of the push:

- [ ] **Dev**: in Netlify, Deploys, lock the published deploy ("Stop auto publishing"). `main` still builds, but nothing is published.
- [ ] **Dev**: mark #157 ready and merge it. Wait for the production build to finish (Deploy log: Node 24, Functions list shows `scan-worker-background`, built by `scripts/build-worker.mjs`, `netlify.toml`). Do not publish yet.
- [ ] **Dev**: fresh backup (step 2), repair (step 3), push (step 4), Vault secrets (step 5).
- [ ] **Dev**: publish the new deploy, then unlock auto publishing (D-45).
- [ ] **Dev**: in the Netlify deploy log, the build passed on Node 24 (`netlify.toml`) and the Functions list shows `scan-worker-background`.
- [ ] **Dev**: `curl -s -o /dev/null -w "%{http_code}" -X POST https://<domain>/.netlify/functions/scan-worker-background` returns 202 (Netlify answers background functions at once). Then check the function log shows 401 for the missing secret.
- [ ] **Dev**: in the live SQL editor, `select id, status_code, left(content, 200), created from net._http_response order by created desc limit 5;` shows recent calls with no errors once a job is queued.

## 10. Turn on real customers

- [ ] **Dev**: let the daily enqueue include real agencies (B-28):

```sql
select cron.schedule('enqueue-due-scans', '0 2 * * *', 'select public.enqueue_due_scans(true)');
select command from cron.job where jobname = 'enqueue-due-scans';  -- shows (true)
```

- [ ] **Dev**: apply the beta users decision (B-81) and check each existing agency has the expected status and credits.

## 11. DNS and email domain

The site already lives on Netlify at `customers.direct`, so the Netlify path needs no DNS change for the site. Email needs the sending domain (details: `src/modules/email/README.md`).

- [ ] **Dev**: add `mail.customers.direct` in Resend.
- [ ] **Jordan** (DNS owner): add the records Resend shows: DKIM TXT `resend._domainkey.mail`, MX `send.mail` (return path), SPF TXT `send.mail`, and DMARC TXT `_dmarc` with `p=none` only if the domain has no DMARC yet.
- [ ] **Dev**: press Verify in Resend; set `EMAIL_FROM` in Netlify; send a test to a Gmail inbox and check SPF, DKIM and DMARC all say PASS.
- [ ] **Jordan**: after 1 to 2 clean weeks, raise DMARC to `p=quarantine`.

## 12. Rollback plan

Use this if the new site is broken for customers and cannot be fixed within an hour.

Prefer a fix forward: most problems are a missing setting (steps 1, 5, 7, 8), not the code.

1. **Dev**: stop real scans: `select cron.schedule('enqueue-due-scans', '0 2 * * *', 'select public.enqueue_due_scans(false)');`.
2. **Jordan**: in Stripe live, disable the webhook endpoint. When the new site is back, re-enable it and resend the events missed in between (Stripe dashboard, Events, Resend, or `stripe events resend <event id>`). Each handler is idempotent, so a resend never grants twice.
3. Going back to the old site needs both, with approval: restore the step 2 backup into live (it loses everything written since), then in Netlify publish the last deploy from before the merge and revert the merge on `main` with a pull request. Publishing the old deploy alone does not work: the old site cannot run on the migrated database (see the top).
4. Keep the old Netlify deploys for at least 7 days after launch.

## 13. Post-launch checks (B-83)

Same day, on production, as an internal account:

- [ ] **Dev**: one real signup with a real card, the payment then refunded in Stripe; one real scan finished and shown on the Overview (B-80).
- [ ] **Dev**: full Playwright suite against production with an internal `is_test` agency.
- [ ] **Both**: walk every phase's demo checklist on desktop and phone (`docs/build-plan/`), including the Phase 10 list: welcome email, share link, PDF, password change, delete a test business, "How we measure", Terms and Privacy, admin view of the new customer.
- [ ] **Dev**: admin settings page (`/internal/admin/settings`) shows every key set, Stripe live, Resend set, the worker's last run and pg_cron's last run.
- [ ] **Dev**: the 12 pg_cron jobs ran without errors (`cron_job_status()`, or `cron.job_run_details`).
- [ ] **Dev**: alerts work: the admin Overview shows no unexpected alerts, and one alert email has arrived at some point (for example after a test failure).
- [ ] **Jordan**: backups are on for the live project as approved in `BACKUPS.md` (plan, option A or B), and the first restore drill is logged there.
- [ ] **Dev**: every item in "Ask Jordan" in DECISIONS.md answered.
- [ ] **Dev**: write the one page launch note: what is live, known limitations, who to contact.
- [ ] **Dev**: after 7 clean days, delete the old env names from step 1 in Netlify.

## Open items found while writing this

- Supabase Auth emails use the built in sender (step 8). Needs a decision.
- Done: Netlify, CI and `package.json` now use Node 24, the active LTS. Supabase JS needs 22 or later, so Node 20 no longer fit.
- Done (2026-10-14): `BETA_FREE_ACCESS`, `TRIAL_ENABLED` and `DATAFORSEO_*` are removed from the code (MVP_SPEC 14); delete them from Netlify if set. `BILLING_ENABLED` is removed too (nothing read it; billing is always on).
- Done: `supabase/migrations/README.md` "Pending for live" lists every file live needs, 021 to 098.
- Done (2026-11-19): Next.js 16.4.6, zod 4.6.7 and undici 7.30.2 fix the critical and high advisories in code the site runs. `npm audit` still lists high ones in build-time tools only (shadcn and react-email CLIs, eslint).
- Backups on production (B-83): proposal in `BACKUPS.md`, waiting for Jordan's approval.
