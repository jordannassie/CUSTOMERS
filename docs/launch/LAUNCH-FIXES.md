# Launch fixes

The verified list of issues found in the pre-launch walk on 2026-10-07 (Khaadi and Cheezious, two real businesses in Pakistan, real AI calls on the local stack), and the order they are fixed in. Each issue was checked in the code (`mvp` at 2cd2d6c), in the local database, and where it shows on a page, in the running app with Playwright at 1440px and 390px.

Work goes straight onto `mvp`, one commit or more per fix group, with the BUG ID in the commit title. New bugs are also logged in [BUGS.md](../BUGS.md) (BUG-073 to BUG-095). Billing follows D-56 and D-57 as written.

Marks: **Confirmed** (seen in code and in the app or data), **Partial** (real, but not quite as reported), **To confirm** (not visible in the code, needs a screenshot).

## Two corrections to the original report

1. **"Claude 0" comes from sample answers, not from the failed checks.** Failed checks are never saved (`scanning/check.ts:49-55`), and an AI with no saved checks shows "No checks yet". But Khaadi still has 36 sample answers about Austin coffee shops in its 30-day window (cost $0, saved while the agency was a test agency), 12 of them from Claude with no mention. Those make "Claude 0" and push confidence up to "Good". So the fix is two parts: keep sample answers out of real numbers (BUG-075), and show "Claude couldn't be checked" (BUG-074).
2. **Claude fails for two reasons.** Cheezious sends country `PK`, and Anthropic answers "Country code PK is not supported" (12 checks). Khaadi has no country saved, so `countryCode()` quietly turns it into `US` and sends an empty region, and Anthropic answers "user_location.region: String should have at least 1 character" (13 checks).

## Verified list

| ID | Issue | Verdict | Severity | Phase | Status |
|---|---|---|---|---|---|
| BUG-073 | Claude fails for businesses outside the countries Anthropic's web search supports, or with no region | Confirmed | High | 1 | Open |
| BUG-074 | An AI that couldn't be checked shows no reason, and confidence ignores it | Partial | High | 1 | Open |
| BUG-075 | Sample answers stay in real scores after a test agency is switched to real | Confirmed | High | 1 | Open |
| BUG-076 | One-word business names are under-counted | Confirmed | High | 1 | Open |
| BUG-077 | Opportunities repeat the wrong counts and leave out an AI without saying why | Confirmed | Medium | 1 | Open |
| BUG-078 | Opportunity titles lowercase brand names ("Ai", "Chatgpt") | Confirmed | Medium | 1 | Open |
| BUG-079 | No way to choose a plan once logged in; Billing tells a trialing account to finish setup | Confirmed | High | 2 | Open |
| BUG-071 | A second business is never billed | Confirmed | High | 2 | Open |
| BUG-066 | No self-serve way to start a plan again | Confirmed | Medium | 2 | Open |
| BUG-080 | A scan that never starts shows "0 of 12" forever | Confirmed | High | 3 | Open |
| BUG-081 | Admin health check says the Perplexity key is rejected while scans work | Confirmed | Low | 3 | Open |
| BUG-082 | PDF export gets 404 from Browserless | Partial | Medium | 3 | Open |
| BUG-083 | A slow ChatGPT answer fails the check after 30 seconds, with no retry | Confirmed | Medium | 3 | Open |
| BUG-084 | Generic template questions ("How much does a clothing store typically cost") | Confirmed | High | 4 | Open |
| BUG-085 | No retail industry, broad competitor suggestions, region text in every question | Confirmed | Medium | 4 | Open |
| BUG-086 | No country field; an unknown country is scanned as the US | Partial | Medium | 4 | Open |
| BUG-087 | A website that blocks our reader gets "create a one-page website" advice | Confirmed | Medium | 4 | Open |
| BUG-088 | Google competitor search waits 25 seconds before failing | Confirmed | Low | 4 | Open |
| BUG-089 | No page shows what the AI actually said | Confirmed | Medium | 7 | Open |
| BUG-090 | Two "Continue" buttons on the competitors step | To confirm | Low | 7 | Open |
| BUG-091 | Services placeholder says "Emergency repairs, drain cleaning" for every business | Confirmed | Low | 7 | Open |
| BUG-092 | While a second business is set up, the sidebar shows the first one | Confirmed | Low | 7 | Open |
| BUG-093 | Adding one Pizza Hut branch marks all 5 as "Added" | Confirmed | Low | 7 | Open |
| BUG-094 | No Billing link in the sidebar | Confirmed | Low | 7 | Open |
| BUG-095 | Awkward or unproven copy: "Enough credits until the next 30 days", "Most of your customers ask here" | Confirmed | Low | 7 | Open |

Setup items that are not code bugs (weekly scans, Stripe, email, PDF keys, live migrations) are under [Outside the code](#outside-the-code).

## Phase 1: Scan accuracy

Fix in this order, then run one real scan per business to confirm.

### BUG-076 One-word names under-counted

- **Seen:** Perplexity named Khaadi in 6 answers, but only 3 were counted (query on `visibility_results`, run of 2026-10-07 12:47).
- **Cause:** `isGenericName` in `src/modules/scanning/mention-text.ts:41` treats every one-word name as generic (`words.length <= 1`). Generic names count only when the city, website or phone is within 200 characters (`mentions.ts:31, 70, 87-92`). The same rule is used to match competitor names (`extract-match.ts:38`).
- **Fix:** a one-word name is generic only when it is in `GENERIC_WORDS` or 4 letters or shorter. A distinctive one-word name ("Khaadi", "Starbucks") still has to be written as a name (capital letter), so "sapphire earrings" doesn't count as Sapphire, but it no longer needs the city nearby. Names of two or more words keep today's rule.
- **Done when:** tests built from the 6 real Khaadi answers pass (labelled by a person), plus Nike and Starbucks positives and lowercase common-word negatives. The mention-detection eval is reported (it skips while it has no labelled data set, F-04).

### BUG-073 Claude location

- **Seen:** `provider_errors` has 12 "Country code PK is not supported" and 13 "user_location.region: String should have at least 1 character" rows.
- **Cause:** `locationOf` and `countryCode` in `src/modules/scanning/service.ts:186-208` send empty city or region as `""`, and turn any unknown country into `US`. `providers/anthropic.ts:55` sends them to the web search tool as is.
- **Fix:** leave out empty fields. Stop defaulting to `US`. When Anthropic rejects the location, ask again once without it (the question already names the city), and remember that country so later checks skip the failing call. OpenAI and Perplexity also stop getting empty fields.
- **Done when:** a Cheezious and a Khaadi scan get Claude answers, and no new Claude 400 errors appear.

### BUG-075 Sample answers in real numbers

- **Seen:** Khaadi's last 30 days include 36 recorded "Austin, TX coffee" answers, $0 cost, from when the agency was a test agency.
- **Cause:** recorded answers are saved as normal rows with no marker (`scanning/check.ts:60`). Switching an agency to real only flips `agencies.is_test` (`admin/agencies/dal.ts:146`). The `visibility_checks_30d` view and `scores/dal.ts:161-219` filter only by date.
- **Fix:** migration 044 adds `visibility_results.is_sample` (default false) and marks the old recorded rows. New recorded answers are marked when saved. Sample rows count only while the agency is still a test agency (in the view, the older-checks read and insights).

### BUG-074 "Couldn't be checked"

- **Seen:** Khaadi and Cheezious overviews show "Claude 0" and "Good confidence" while every real Claude check failed.
- **Cause:** failed checks leave no row. A failure is kept only as free text in `visibility_runs.error`, and the dashboard warns only when the whole scan failed (`app/(app)/dashboard/page.tsx:63-68`).
- **Fix:** each run records its failures per AI (`visibility_runs.failed_by_provider`, migration 044). An AI that was chosen but has no checks, and whose last run failed for it, shows "Claude couldn't be checked" with a plain reason. The confidence line says how many AIs it is based on. The dashboard also notes a partly failed scan.

### BUG-077 and BUG-078 Opportunities

- **Seen:** "Out of 23 answers checked, only 4 named Khaadi. ChatGPT named you in just 1 of its 11 answers, and Perplexity named you in 3 of its 12", with nothing about Claude. Titles: "Ai almost never mentions you", "Chatgpt knows you less than perplexity does".
- **Cause:** the writer is only given AIs with saved checks (`insights/facts.ts:187-212`), so Claude disappears. The prompt asks for "sentence case" (`insights/prompts/explain.v1.ts:40`), and the model lowercases brand names. Nothing in the code changes the case.
- **Fix:** pass the AIs that couldn't be checked to the writer (new prompt version `explain.v2`, which says so in one line and never compares them). Keep brand names as written, and fix their case in code after the model answers (AI, ChatGPT, Claude, Perplexity). Run the `why-competitors-win` eval and report it.

## Phase 2: Choosing a plan and billing (D-56, D-57)

### BUG-079 No way to choose a plan

- **Seen:** Billing for a trialing account that finished setup says "You don't have a plan yet. Finish setup to start your 7-day free trial. You choose a plan for each business there." The button goes to `/onboarding`, which sends the user back to the dashboard.
- **Cause:**
  - the pricing page's buttons only go to signup (`components/marketing/pricing/PlanCards.tsx:100`)
  - the card step uses the plan picked on the pricing page, or Starter (`onboarding/wizard/card/dal.ts:29`)
  - the only plan buttons are inside Billing, and only once a plan exists (`settings/billing/_components/plan-bill.tsx`)
- **Fix:** a "Choose plan" page for logged-in users (`/settings/billing/plans`):
  - with no plan or an ended plan, it starts checkout (`billing/checkout.ts`)
  - on an active plan, it adds or changes a plan per business (`billing/plan-change`)
  - Billing, the pricing page (when logged in), the trial limit note and the new sidebar link all go there. This also covers BUG-066.

### BUG-071 Second business never billed

- **Cause:**
  - for every business after the first, the card step is skipped (`onboarding/wizard/steps.ts:51-53`)
  - `finishWizard` makes the business active with no Stripe call (`wizard/questions/dal.ts:182-198`)
  - neither `canStartScan` nor `enqueue_due_scans` checks for a plan
- **Fix:**
  - the wizard shows an "Add this business to your plan" step with the prorated price (D-57), and finishing adds the subscription item
  - trial accounts keep the 2-business limit (D-16)
  - scans, manual or scheduled, need the business to have a plan item that is active, trialing or beta (migration 045)

## Phase 3: Reliability

### BUG-080 Stuck scan

- **Cause:**
  - without `WORKER_URL`/`WORKER_SECRET` (and with `WORKER_IN_PROCESS` off), `postToWorker` returns false, `startScan` still answers "queued", and nothing is logged (`jobs/dal.ts:141`, `jobs/actions.ts:44-73`)
  - the first-scan screen polls every 2 seconds with no time limit (`components/onboarding/FirstScan.tsx:109-125`)
- **Fix:**
  - finish the work started in the `fix/stuck-scan-message` worktree: a `stalled` state after 3 minutes queued or 15 minutes running
  - the user sees "This scan hasn't started" with a retry button
  - an admin alert fires in production when no worker is set up

### BUG-081 Perplexity health check

- **Cause:** the health check calls `GET /async/chat/completions` (`system-status/service.ts:37-46`), but scans use `POST /v1/agent`. Sonar Chat Completions was retired on 2026-09-27, and any 401 or 403 there reads as "key rejected" (line 116).
- **Fix:** the check proves the key against the endpoint scans use. The Browserless check reads `BROWSERLESS_URL` instead of a fixed host.

### BUG-082 PDF 404

- **Cause:** `new URL("/pdf", env.BROWSERLESS_URL)` drops any path in the base URL (`reports/pdf.ts:62-79`). The 404 may also come from the host value set on Netlify, which can't be seen from here.
- **Fix:** join the URL so the base path is kept. Confirm the right endpoint with the account's key, and export a real PDF locally.

### BUG-083 ChatGPT timeout

- **Cause:** one 30-second timeout for every AI (`scanning/providers/request.ts:5`), and `ProviderError.retryable` is never read (`check.ts:49-55`).
- **Fix:** ChatGPT gets 60 seconds, and a check that fails with a retryable error is tried once more. A check that still fails is not charged, as today.

## Phase 4: Quality

### BUG-084 Template questions

- **Cause:**
  - `question_library` is empty, so questions come from Claude or, when that fails, from the old template engine
  - the template lines are written for trades: "offers same-day or emergency service", "typically cost" (`lib/geo/prompt-engine.ts:51, 55`)
  - Claude's list is also topped up with template lines when it returns fewer than 12 (`onboarding/questions.ts:99`)
- **Fix:**
  - find out from the logged warning why Khaadi fell back
  - drop trade-only lines for other industries, and stop topping up with template lines
  - run the `question-picking` eval

### BUG-085 Retail, competitor relevance, region

- **Cause:**
  - no retail option in `lib/industries.ts:3-15` or the Google type map (`onboarding/industries.ts`)
  - the competitor search sends only a text query, with no location bias or place type (`onboarding/competitor-places.ts:63-68`)
  - `cityLabel` adds the full region to every question ("Rawalpindi, Islamabad Capital Territory", `onboarding/question-rules.ts:18`)
- **Fix:**
  - add a retail industry (clothing and other shops)
  - search near the business's own place with its place type (location fetched live, not stored, MVP_SPEC 26)
  - questions use the city alone unless the region is a short state code ("Austin, TX")

### BUG-086 Country field

- **Cause:** `primary_country` exists and is saved, but no form shows it (`components/onboarding/DetailsStep.tsx`, `components/settings/BusinessProfileForm.tsx`).
- **Fix:** a Country field in setup and Settings. No US default (see BUG-073).

### BUG-087 Blocked website advice

- **Cause:**
  - when no page could be read, nothing is saved, so the advice can't tell "blocked" from "no website" (`onboarding/autofill.ts:92-100`, `insights/facts.ts:224`)
  - the template writer then says "AI has no website of yours to read" (`insights/template-writer.ts:61-71`)
  - the checklist always lists "Build a simple one-page website" (`opportunities/checklist.ts:119`); the live Khaadi page shows it
- **Fix:**
  - save the read result even when the site blocked us
  - advice says the site blocks AI readers and how to let them in
  - the checklist skips the website item when the business has a website

### BUG-088 Competitor search timeout

- **Fix:** 8 seconds instead of 25 (`onboarding/http.ts:5`, `onboarding/dal.ts:117`), and saved competitors load in parallel.

## Phase 5: Stripe sandbox, end to end

Needs sandbox keys in `.env` (empty today). With `stripe listen` and a test clock, run:
- checkout with a trial
- trial end and renewal
- cancel
- buying credits
- adding a second business (prorated)

Check that `credit_grants` and `business_billing_items` are right and that a replayed webhook changes nothing.

## Phase 6: Staging

Each step that touches the shared or live database needs a yes first (D-43):
1. Back up the live database.
2. Apply migrations 021 to 045.
3. Set the Netlify environment.
4. Set the Vault secrets and turn on scheduled scans.
5. Walk the [rehearsal checklist](./REHEARSAL-CHECKLIST.md).

## Phase 7: Polish

| ID | Fix |
|---|---|
| BUG-089 | "See the answer" on the Questions page: the question, the AI, what it said, and why it was or wasn't counted (`visibility_results.answer_text` is stored but never shown) |
| BUG-090 | Screenshot the competitors step at each width; keep one Continue button (`components/onboarding/CompetitorPicker.tsx:201-239`) |
| BUG-091 | Placeholder by industry, neutral by default (`DetailsStep.tsx:139`) |
| BUG-092 | During setup the sidebar says "Setting up <business>", and unfinished drafts stay out of the switcher (`app/(app)/layout.tsx:29-50`) |
| BUG-093 | Match competitors by Google place, not name (`CompetitorPicker.tsx:40-41`). Other branches show "Already tracking Pizza Hut", since AI answers name the brand, not the branch |
| BUG-094 | Billing in the sidebar (`components/app/nav.ts`) |
| BUG-095 | "Enough credits for the next 30 days" (`components/usage/ForecastCard.tsx:13`); a factual ChatGPT line instead of "Most of your customers ask here" (`modules/settings/service.ts:6`) |

## Outside the code

| Item | State | What it needs |
|---|---|---|
| Weekly scans | Real customers are never scheduled: cron runs `enqueue_due_scans(false)`, test agencies only (`migrations/029:88`) | Vault secrets `scan_worker_url`, `scan_worker_secret`, `system_alerts_url` and `email_jobs_url`, then switch to `enqueue_due_scans(true)` ([migrations README](../../supabase/migrations/README.md)) |
| Worker | `WORKER_URL` is not set locally; on Netlify it must be set, or no scan runs | `WORKER_URL` and `WORKER_SECRET` on Netlify, the same secret in Vault |
| Stripe | Keys empty locally | Sandbox keys and the Stripe CLI |
| Email (Resend) | Key empty locally | `RESEND_API_KEY`, `EMAIL_FROM`, verified domain |
| PDF (Browserless) | Key set locally; 404 seen | Check `BROWSERLESS_URL` on Netlify after BUG-082 |
| Live database | Migrations 021 to 043 not applied (044 and 045 come from this work) | Backup, then apply ([BACKUPS.md](./BACKUPS.md)) |

## Working (spot-checked on 2026-10-07)

Checked in the app at 1440px and 390px with no console errors:
- Overview, Opportunities, Competitors, Questions, Sources, Settings, Usage and Billing load for both businesses.
- The business switcher works.
- Scans finish with real ChatGPT and Perplexity answers. Both 36-check scans finished in under a minute with the worker running in-process.
- Failed checks were not charged: Khaadi's run had 13 failed checks and was charged 23 credits, and Cheezious had 12 failed and was charged 24.

Login, admin pages, onboarding auto-fill, share links and the Buy credits layout were reported working and are walked again in the Phase 6 rehearsal.
