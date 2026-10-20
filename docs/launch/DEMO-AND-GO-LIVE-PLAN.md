# Demo and go-live plan

Written 2026-10-17 on `mvp-bugs-fixes`. What is left before the client demo and before real customers, what each item needs, where to get it, and how to check it. Items marked **Dev** can be done in the code; **Jordan** means an account or decision only he has. The step-by-step launch day list stays in [RUNBOOK.md](./RUNBOOK.md); this file is the plan that leads up to it.

Never paste a key or secret into this file, a pull request or a chat.

## 1. Done in this pass (2026-10-17)

| Item | What changed |
|---|---|
| Plan switch during a trial | Billing's "Upgrade to Pro" and "Move to Starter" both apply at once while the trial runs, as often as the owner likes. The trial ends on whatever plan each business is on then. After the trial, upgrades still apply now and downgrades at the renewal (D-57). |
| Amounts during a trial (BUG-245) | The change dialog no longer says "Your next bill will be $0". It says "Your first bill on <trial end> will be $X", worked out from every business left on the plan after the change. The same fix covers "Remove" during a trial. |
| Plan limits on a move to Starter | A business tracking more competitors (or questions) than Starter allows is asked to remove some first, with the exact number, instead of ending up over its plan. |
| Switching business | The switcher now opens the other business's Overview. Before, it stayed on the same page (Billing included), which looked as if nothing had changed. |
| Business logo | Setup reads the logo from the business's home page (the touch icon, the logo in the page's structured data, a header image named "logo", or the largest favicon) and shows it in the business switcher. No extra request: it comes from the page auto-fill already reads. |
| Scans after a trial ends (BUG-251) | An account still "trialing" after its trial end date (Stripe never confirmed the first payment) could keep scanning on top-up or promo credits. Scans and top-up spending now stop at the trial end until the payment is confirmed; the banner and sidebar say so. |
| Moving down on a paid plan | Kept at the renewal (D-57), as decided on 2026-10-18, with clearer words: the button reads "Move to Starter on Nov 17", the dialog says "<business> moves to Starter on <date>, when your plan renews. Until then it stays on its current plan", and a scheduled move shows "Stays on Pro until <date>, then moves to Starter". |
| Delete dialog console error | Deleting a business during a trial listed two "Now" steps with the same React key. |
| CI | `check:auth` knew only `requireUser()` by name and flagged the onboarding actions, which check the user through `activeUser()`; it now knows that helper. The pricing smoke test opens the contact form's topic list before reading it (the list became our own Select on 2026-10-16). |

Not yet done from this list: businesses set up before today get a logo only when they are set up again; the monthly website re-read could fill it in (Dev, 1 hour).

## 2. Flows that are built but have never run for real

Each one works in tests and with fixtures. Each needs an account or setting before it can run for real.

### 2.1 Stripe: trial end, renewals, failed payments, webhooks

**Needs**
- Sandbox now (exists): `STRIPE_SECRET_KEY` (restricted), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Live later (**Jordan**, D-40): his own Stripe account in his LLC, final prices (D-21, D-22), tax decision (BILL-02).

**Where**
- Keys: Stripe dashboard, Developers, API keys. Make a restricted key with write access to Customers, Subscriptions, Subscription schedules, Invoices, Payment intents, Setup intents, Checkout sessions, Prices, Products, Billing portal; read access to Charges and Refunds.
- Webhook: Developers, Webhooks, Add endpoint `https://<host>/api/stripe/webhook` with these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`. Its signing secret is `STRIPE_WEBHOOK_SECRET`.
- Locally: install the Stripe CLI, `stripe login`, then `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.trial_will_end,invoice.paid,invoice.payment_failed,charge.refunded --forward-to localhost:3000/api/stripe/webhook` (CLI 1.53 needs the events listed). Its `whsec_` already matches `.env` on this machine.
- Catalog: `npm run stripe:catalog-sync`, then `npm run stripe:catalog-check` (creates the plan and top-up products in that account).

**How to check (Dev, half a day, in the sandbox)**
1. Trial end: start a trial with card `4242 4242 4242 4242`. In Stripe, open the customer, Subscriptions, and run a test clock (Billing, Test clocks) past the trial end. Expect an invoice for every business at its plan's price, the plan credits granted, and the trial banner gone.
2. Failed renewal: change the card to `4000 0000 0000 0341` (attaches, then fails), advance the clock a month. Expect "past due" in the app, the payment failed email, and plan changes refused until the card is updated.
3. Plan switch in a trial: switch Starter and Pro both ways, then advance past the trial end. Expect the first bill on the last plan chosen.
4. Top-up and refund: buy a top-up, refund it in Stripe, expect the credits taken back.

### 2.2 Emails (welcome, trial ending, payment failed, low credits, weekly report)

**Needs**: a Resend account, a verified sending domain (**Jordan**: DNS access, F-12), `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_UNSUBSCRIBE_SECRET`, and the Vault secret `email_jobs_url`.

**Where**
- Resend: resend.com, Domains, Add domain `mail.customers.direct`. It gives three or four DNS records (SPF TXT, DKIM TXT, the return path MX). Jordan adds them where the domain's DNS lives. Then API keys, "Sending access" only.
- `EMAIL_FROM`: for example `Customers.Direct <hello@mail.customers.direct>`.
- `EMAIL_UNSUBSCRIBE_SECRET`: make one, `openssl rand -hex 32`. Never change it later (old links stop working).
- Login and signup emails come from Supabase Auth, not Resend. Its built-in sender allows only a few emails an hour, so signups will fail once real people arrive. In Supabase, Authentication, Emails, SMTP settings, use Resend's SMTP (host `smtp.resend.com`, port 465, user `resend`, password the API key).

**How to check**: sign up with a real inbox. Expect the confirm email (Supabase), then the welcome email (Resend). The other four are triggered by the Stripe checks above and by spending credits below 20%.

### 2.3 Scheduled scans (daily, weekly, monthly)

**Needs**: `WORKER_URL` and `WORKER_SECRET` on Netlify, the four Vault secrets in the database, and the switch that lets real agencies be queued.

**Where and how** (Dev, with database access; full SQL in `supabase/migrations/README.md`, "Vault"):
1. Netlify, Site configuration, Environment variables: `WORKER_SECRET` (make one, `openssl rand -hex 32`), `WORKER_URL = https://<host>/.netlify/functions/scan-worker-background`.
2. In the database: `scan_worker_url`, `scan_worker_secret` (the same value as `WORKER_SECRET`), `system_alerts_url`, `email_jobs_url`.
3. Only at go-live: `select cron.schedule('enqueue-due-scans', '0 2 * * *', 'select public.enqueue_due_scans(true)');`. Until then only test agencies are queued, so real customers are never scanned by unreleased code.

**How to check**: set a test business to daily, wait for 02:00 UTC (or call `select public.enqueue_due_scans(false)`), and check `select id, status_code from net._http_response order by created desc limit 5;` shows 200s and a new scan on the Overview.

### 2.4 PDF export

**Needs**: a Browserless account and `BROWSERLESS_API_KEY` (and `BROWSERLESS_URL` if not the San Francisco region).
**Where**: browserless.io, the dashboard's API token.
**How to check**: on the deploy, Overview, Export PDF. Expect a download within a few seconds that matches the share page. On failure the page says "PDF could not be created. Try again, or use Print, Save as PDF."

### 2.5 Keys owned by the client (B-01)

The AI, Places and Firecrawl keys in use are the developer's. Before launch, **Jordan** makes his own and they are set on Netlify:
- OpenAI (platform.openai.com, API keys), Anthropic (console.anthropic.com), Perplexity (perplexity.ai, Settings, API).
- Google Cloud: a project with "Places API (New)" on, an API key limited to that API. Raise the "GetPlaceRequest per day" quota above 100 (it ran out in testing).
- Firecrawl (firecrawl.dev, API keys), on a plan with enough pages (up to 5 pages for each new business).

## 3. Partly done flows and open bugs

| Item | Now | Plan | Who, size |
|---|---|---|---|
| Same-day rescan (BUG-199) | Fixed 2026-10-20: reused answers are free for now (D-24 changed at the owner's request); "Scan again?" still asks within 20 hours | Revisit the charging rule later | Owner, later |
| Weekly report switch (EMAIL-01) | Every owner gets it; only the email's unsubscribe link stops it | A switch in Settings, Notifications | Dev, half a day |
| Question quality (B-32, B-33) | Falls back to a general set for some industries | A person reviews about 40 templates per industry; then the picking eval runs | Developer or Jordan, 1 to 2 days |
| Evals (B-24, B-25, B-34, B-51, B-75) | The code exists; no labelled data, so no baseline | Label 150 to 200 answers for mention detection and 30 to 50 businesses for auto-fill | People, 2 to 3 days |
| Calibration (B-76) | Not done | Compare 20 of our answers with the real ChatGPT, Claude and Perplexity apps | Developer, half a day |
| Batch name extraction (F-39) | Scheduled scans use the live call | Batch API at half price for scheduled scans | Dev, 2 days, after launch is fine |
| Trials past their end date | Scans now stop, but the account waits for Stripe's event; if it never comes, it waits for ever | A daily job re-reads from Stripe every trial past its end date (`syncSubscriptionFromStripe`) | Dev, half a day |
| Local test accounts | `abdul@test.com` has a simulated subscription (`sub_local_sim_abdul`) that Stripe doesn't know, so it stays paused | Give it a real sandbox trial, mark it as a test agency, or delete it | Dev, minutes |
| 404 pages answer 200 (BUG-067) | Low; shows the right page | Needs a decision on `proxy.ts` | Later |
| Old businesses have no logo | Only new setups get one | Fill it in during the monthly website re-read | Dev, 1 hour |

## 4. Go-live blockers

In order. Most are in [RUNBOOK.md](./RUNBOOK.md); this is the short list.

1. **Decisions (Jordan)**: prices (D-21 is still "Ask Jordan"), his Stripe account (D-40), beta users (B-81), Terms and Privacy legal review (B-78, 17 questions in PR #126), Places terms (B-79), deletion wait of 30 days (F-69).
2. **Branches (Dev)**: merge `mvp-bugs-fixes` into `mvp` by pull request (17 commits). Then merge `main` into `mvp`: `main` has 52 commits that `mvp` lacks (marketing and login page changes), so expect conflicts in the marketing pages. Rerun every check after.
3. **Branch protection (Jordan)**: turn it on for `main` and `mvp` (F-05).
4. **CI green**: Typecheck, Lint (with `check:auth`), Unit tests, Build and Smoke tests all pass on `mvp`.
5. **Database (Dev, after a backup)**: live has migrations 001 to 020 only. Repair the history, then apply 021 to 070 (RUNBOOK steps 2 to 4, BACKUPS.md). Check `customers-dev` first with `supabase migration list --linked` (F-24).
6. **Settings**: everything in section 2 set for production.
7. **Rehearsal (B-83)**: the whole REHEARSAL-CHECKLIST on the staging deploy, logged in (F-02), including one real scan through the Netlify worker (F-37).
8. **Switch**: Vault URL to production and `enqueue_due_scans(true)` (section 2.3), then merge `mvp` into `main`.

## 5. Ready for the demo

The demo shows the product working, not live money. What to do before it:

1. **Pick where to run it.**
   - Locally (safest): `npm run dev` against the local database, logged in as a test agency.
   - The preview at `deploy-preview-146--customersdirect.netlify.app`: first check its database has migrations up to 070. PR #146 says it needs 044 to 060, and this branch now needs up to 070. Log in once and open Overview, Billing and Settings before the call. If a page errors, use the local run.
2. **Use a test agency** (`is_test`): scans use recorded answers, so they cost nothing and finish in seconds. Admin, Agencies, mark as test.
3. **Prepare two businesses** with a finished scan each, so Overview, Competitors, Opportunities, Questions and Sources all have data, and the switcher shows two logos.
4. **What to show**: sign up, setup (auto-fill, competitors, questions, plan, card with `4242 4242 4242 4242`), first scan, Overview, Opportunities with "Copy for Claude", Competitors, Billing (switch Starter and Pro both ways in the trial and see the first bill change), Buy credits, share link, admin.
5. **What to avoid**, since it needs section 2 first: the trial ending, emails arriving, PDF export, scans starting on their own.
6. **The night before**: run the smoke tests (`npm run test:e2e`) and click through the list in point 4 at desktop and phone width.

## 6. Order of work from here

| Step | What | Who |
|---|---|---|
| 1 | Review and commit this pass; push and check CI is green on PR #146 | User, then Dev |
| 2 | Check the preview's database and log in there (section 5.1) | Dev |
| 3 | Stripe sandbox checks with test clocks (2.1) | Dev |
| 4 | Ask Jordan for the decisions in section 4.1 and the accounts in 2.2 and 2.5 | User |
| 5 | Resend domain and Supabase SMTP once DNS access arrives (2.2) | Dev, Jordan |
| 6 | Worker and Vault on the staging deploy, one real scheduled scan (2.3) | Dev |
| 7 | Merge into `mvp`, merge `main` into `mvp`, CI green (4.2) | Dev |
| 8 | Labelling, calibration and question review (section 3) | People |
| 9 | Rehearsal on staging, then go-live (RUNBOOK) | Both |
