# Launch fixes

The verified list of issues found in the pre-launch walk on 2026-10-07 (Khaadi and Cheezious, two real businesses in Pakistan, real AI calls on the local stack), and the order they are fixed in. Each issue was checked in the code (`mvp` at 2cd2d6c), in the local database, and where it shows on a page, in the running app with Playwright at 1440px and 390px.

Work goes straight onto `mvp`, one commit or more per fix group, with the BUG ID in the commit title. New bugs are also logged in [BUGS.md](../BUGS.md) (BUG-073 to BUG-098). Billing follows D-56 and D-57 as written.

Marks: **Confirmed** (seen in code and in the app or data), **Partial** (real, but not quite as reported), **To confirm** (not visible in the code, needs a screenshot).

## Two corrections to the original report

1. **"Claude 0" comes from sample answers, not from the failed checks.** Failed checks are never saved (`scanning/check.ts:49-55`), and an AI with no saved checks shows "No checks yet". But Khaadi still has 36 sample answers about Austin coffee shops in its 30-day window (cost $0, saved while the agency was a test agency), 12 of them from Claude with no mention. Those make "Claude 0" and push confidence up to "Good". So the fix is two parts: keep sample answers out of real numbers (BUG-075), and show "Claude couldn't be checked" (BUG-074).
2. **Claude fails for two reasons.** Cheezious sends country `PK`, and Anthropic answers "Country code PK is not supported" (12 checks). Khaadi has no country saved, so `countryCode()` quietly turns it into `US` and sends an empty region, and Anthropic answers "user_location.region: String should have at least 1 character" (13 checks).

## Verified list

| ID | Issue | Verdict | Severity | Phase | Status |
|---|---|---|---|---|---|
| BUG-073 | Claude fails for businesses outside the countries Anthropic's web search supports, or with no region | Confirmed | High | 1 | Fixed (8180e18) |
| BUG-074 | An AI that couldn't be checked shows no reason, and confidence ignores it | Partial | High | 1 | Fixed, not committed |
| BUG-075 | Sample answers stay in real scores after a test agency is switched to real | Confirmed | High | 1 | Fixed, not committed |
| BUG-076 | One-word business names are under-counted | Confirmed | High | 1 | Fixed (bbd1701) |
| BUG-077 | Opportunities repeat the wrong counts and leave out an AI without saying why | Confirmed | Medium | 1 | Fixed, not committed |
| BUG-078 | Opportunity titles lowercase brand names ("Ai", "Chatgpt") | Confirmed | Medium | 1 | Fixed, not committed |
| BUG-079 | No way to choose a plan once logged in; Billing tells a trialing account to finish setup | Confirmed | High | 2 | Fixed, not committed |
| BUG-071 | A second business is never billed | Confirmed | High | 2 | Fixed, not committed |
| BUG-066 | No self-serve way to start a plan again | Confirmed | Medium | 2 | Fixed, not committed |
| BUG-080 | A scan that never starts shows "0 of 12" forever | Confirmed | High | 3 | Fixed, not committed |
| BUG-081 | Admin health check says the Perplexity key is rejected while scans work | Confirmed | Low | 3 | Fixed, not committed |
| BUG-082 | PDF export gets 404 from Browserless | Partial | Medium | 3 | Fixed, not committed |
| BUG-083 | A slow ChatGPT answer fails the check after 30 seconds, with no retry | Confirmed | Medium | 3 | Fixed, not committed |
| BUG-084 | Generic template questions ("How much does a clothing store typically cost") | Confirmed | High | 4 | Fixed, not committed |
| BUG-085 | No retail industry, broad competitor suggestions, region text in every question | Confirmed | Medium | 4 | Fixed, not committed |
| BUG-086 | No country field; an unknown country is scanned as the US | Partial | Medium | 4 | Fixed, not committed |
| BUG-087 | A website that blocks our reader gets "create a one-page website" advice | Confirmed | Medium | 4 | Fixed, not committed |
| BUG-088 | Google competitor search waits 25 seconds before failing | Confirmed | Low | 4 | Fixed, not committed |
| BUG-097 | A business saved under one branch's Google name ("Cheezious Golra Mor Branch"), or a competitor under a long Google title ("Radiant Plumbing, Air Conditioning, & Electrical"), is never counted when AI names the brand | Confirmed | High | 4 | Fixed, not committed |
| BUG-098 | Dev overlay: "'<Page> [Prerender]' cannot have a negative time stamp" on pages that redirect | Confirmed (dev only) | Medium | 3 | Fixed, not committed |
| BUG-099 | A fix says the business's Google rating is lower when it is higher | Confirmed | High | now | Fixed, not committed |
| BUG-100 | A fix asks the owner to check their listing on other businesses' own websites | Confirmed | Medium | now | Fixed, not committed |
| BUG-101 | One brand listed twice in "Also recommended by AI" (long and short name) | Confirmed | Low | now | Fixed, not committed |
| BUG-102 | A mistyped website address is not flagged | Confirmed | Low | now | Fixed, not committed |
| BUG-096 | Website check (`/compare`) shows a competitor that blocks automated readers only as "Not reached" | Confirmed (not "always": only sites that block us) | Medium | 4 | Fixed, not committed |
| BUG-089 | No page shows what the AI actually said | Confirmed | Medium | 7 | Open |
| BUG-090 | Two "Continue" buttons on the competitors step | To confirm | Low | 7 | Open |
| BUG-091 | Services placeholder says "Emergency repairs, drain cleaning" for every business | Confirmed | Low | 7 | Open |
| BUG-092 | While a second business is set up, the sidebar shows the first one | Confirmed | Low | 7 | Open |
| BUG-093 | Adding one Pizza Hut branch marks all 5 as "Added" | Confirmed | Low | 7 | Open |
| BUG-094 | No Billing link in the sidebar | Confirmed | Low | 7 | Fixed, not committed |
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

### Phase 1 results (2026-10-08)

- **Checks:**
  - `npx tsc --noEmit` passes
  - `npx eslint src` has 0 errors and 15 warnings, all in files this work didn't touch
  - `npm test` passes 1104 tests (1 skipped), run on an isolated test stack
  - `npm run build` passes
- **Real scans after the fix** (Khaadi 19:22 UTC, Cheezious 19:15 UTC): all 36 checks answered, including 12 from Claude for each business, with no new `provider_errors` (BUG-073).
- **Mentions:** Khaadi's counted mentions equal the answers that name it, for every AI (BUG-076). Replaying the 47 saved real answers from before, Perplexity goes from 3 to 6 of 12.
- **Sample answers:** after migration 044, Khaadi's 108 recorded sample answers no longer count. The Overview went from "Claude 0" to Claude 17, from real answers (BUG-075).
- **Couldn't be checked (BUG-074):** covered by unit tests (`overview/service.test.ts`, `scanning/service.test.ts`). It hasn't been seen on a page, because Claude no longer fails for these businesses.
- **Opportunities (BUG-077, BUG-078):** a dry run of prompt v2 on Khaadi's earlier run, where Claude failed, wrote "Claude could not be checked in this scan, so no comparison is possible for it" inside the ChatGPT and Perplexity reason. Titles keep "AI", "ChatGPT" and "Perplexity", and the code also fixes name case and capitalises the first letter.
- **Evals:**
  - code graders pass (31 tests)
  - mention-detection is skipped (no labelled dataset, F-04)
  - why-competitors-win can't run its AI-graded eval (only an example dataset)
- **DB:** migration 044 is applied to the local dev database only, after a `pg_dump` backup. Types are regenerated for the new columns and view.

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

### Phase 2 results (2026-10-08)

Built:
- **Choose plan page** (`/settings/billing/plans`):
  - Plan cards and the monthly total for the agency's set-up businesses.
  - The 7-day trial only when the agency never had one (F-43); otherwise "You pay $X today".
  - Stripe's card form on the page, then "Setting up your plan…" until the webhook starts it.
  - A restart reuses the agency's Stripe customer.
  - An agency with a running plan is sent to Billing, where plan changes already work.
- **Ways in:**
  - Billing's "Choose a plan" or "Start your plan again" button (they replace "Finish setup" and "Contact us").
  - The dashboard's "plan ended" banner (BUG-066).
  - The pricing page plan buttons for a signed-in user (`/signup?plan=pro` now opens Choose plan with Pro selected).
  - A new Billing link in the sidebar (BUG-094).
- **No webhook change:** the existing handlers link the subscription and grant credits from the same metadata as the signup trial.

- **Second business billed after the trial (BUG-071, D-57):** a business set up after the first now joins the agency's subscription when setup finishes, on the plan the other businesses use.
  - On a trial, the models step says "This business joins your Starter plan. It's free during your trial, then $149 a month." Stripe bills it with the others when the trial ends.
  - On a paid plan, the step shows the prorated amount charged today before "Finish setup", and finishing charges exactly that amount (D-57).
  - A declined card stops setup with a clear message, and nothing is added.
  - An agency with no subscription (no plan yet, or a test agency) is unchanged: the Choose plan page bills every business when the plan starts.
  - Only a business added after one already on the plan is added this way. The first business joins at checkout, and the Stripe webhook can save its row after setup finishes, so adding it here would bill it twice. The first-scan e2e caught this on 2026-10-08, and it's now guarded.
  - The plan check on scans (migration 045) is still not built.
- **Flaky billing tests explained:** the fake Stripe used in tests numbered new items `si_fake1`, `si_fake2` and so on, separately for each test. Two tests adding a business at the same time made the same item ID, and the database rejected the second (`duplicate key … stripe_subscription_item_id_key`). The fake now adds a random tag to its IDs. The failures that remained in fully parallel runs came from local Supabase auth timing out under load ("We couldn't check your account just now"). The same specs pass 32 of 32 with one worker.

Checks (after the BUG-071 work, 2026-10-08):
- `npx tsc --noEmit` passes.
- `npx eslint src` has 0 errors (15 warnings in files this work didn't touch).
- `npm test` passes 1117 tests (1 skipped).
- `npm run build` passes.
- **e2e,** run in a temporary worktree with Stripe fixtures:
  - `billing.spec.ts`, `choose-plan.spec.ts` and `onboarding.spec.ts` pass 32 of 32 at 1440px and 390px with one worker, including the new "a business set up after the first joins the plan, free until the trial ends" test.
  - `app-shell.spec.ts` passes.
- **Seen in the dev app** at 1440px and 390px: the Billing panel, the Choose plan page in the "not available" state (no Stripe keys locally), the sidebar Billing link and the signup redirect.
- **Not checked yet:** a real Stripe checkout, which needs sandbox keys (Phase 5).

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

### Worker and weekly scans runbook (run in Phase 6, each step approved first)

Full commands are in [supabase/migrations/README.md](../../supabase/migrations/README.md) ("Worker URL and secret", "Go-live switch") and [RUNBOOK.md](./RUNBOOK.md). In order:

1. **Netlify env:**
   - `WORKER_SECRET`, a long random value
   - `WORKER_URL` = `https://<domain>/.netlify/functions/scan-worker-background`
   - Leave `WORKER_IN_PROCESS` unset in production.
   - Without these, Run scan only queues the job, and the screen now says "waiting longer than usual" after 3 minutes (BUG-080).
2. **Vault secrets, per Supabase project:** `scan_worker_url` (same URL), `scan_worker_secret` (same value as `WORKER_SECRET`), `system_alerts_url` (`/api/alerts/check`) and `email_jobs_url` (`/api/email/jobs`).
3. **Check:** `select id, status_code, left(content, 200), created from net._http_response order by created desc limit 5;` shows 2xx answers from the worker every minute.
4. **Go-live switch:** reschedule `enqueue-due-scans` with `enqueue_due_scans(true)`. Until then only test agencies get weekly scans.
5. **Alerts:** `check_system_alerts()` already raises a critical `stuck_jobs` alert ("Check that the worker is running") when a job is queued or running for over 30 minutes. It reaches the admins only once step 2 is done.

### Phase 3 results (2026-10-08)

- **BUG-080 stuck scan:** finished the work from the `fix/stuck-scan-message` worktree.
  - A job no worker picked up 3 minutes after it was due, or still running after 15 minutes, shows as stalled. The first-scan screen says "Your first scan is taking longer than usual" instead of a spinner, and Run scan says "Waiting to run".
  - It keeps polling, so it moves on by itself once a worker runs the job.
  - The server logs a warning when Run scan finds no worker to start. Admins get the existing `stuck_jobs` alert.
- **BUG-081 Perplexity health check:** now calls `GET /v1/models` on the Agent API, which scans use. Tested by hand: a real key gets 200 and a fake key 401. The old endpoint returned 403 even to the real key. The admin health page now shows Perplexity as "Connected. The key works."
- **BUG-082 PDF and Browserless:**
  - The health check called `/pressure`, which Browserless removed (404), so it now calls `/meta` (200 for a real key, 401 for a fake one) on the configured `BROWSERLESS_URL`.
  - PDF export now keeps any path in `BROWSERLESS_URL`.
  - The local `.env` had a trailing space after `BROWSERLESS_API_KEY`, which broke the token, so env values are now trimmed. Check the same key on Netlify.
  - A direct Browserless `/pdf` call with the key returned a real 121 KB PDF.
  - Not checked: exporting the app's own share page from this machine, because Browserless can't reach `localhost`. That's checked on staging in Phase 6.
- **BUG-083 ChatGPT timeout:** ChatGPT gets 60 seconds instead of 30. Any check that fails with a retryable error (timeout, network, server, a failed search) is tried once more, and a check that still fails is not charged.
- **Checks:** see "Phase 3 checks" below.

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

### BUG-096 Website check: blocked sites

- **Reported:** the competitor always shows "Not reached" (nike.com against adidas.com).
- **Seen:** `readSite` on 2026-10-08:
  - nike.com, starbucks.com, khaadi.com and sapphireonline.pk are all reached, in either order
  - adidas.com answers 403 to our reader, to a browser user agent and to GPTBot alike, so we can't read it
- **Cause:** `readiness-check/fetch-site.ts` turns every failure into `null`. The page can't tell "blocks automated readers" from "doesn't exist", so it says "We could not open adidas.com" with no reason. For your own site it says "Check the address", even when the address is right.
- **Fix:** `readSite` returns why it failed (blocked: 401, 403, 429, 503 or a challenge page; unreachable: DNS, timeout or another error).
  - For a blocked competitor, the headline says the site blocks automated readers like ours, and that many AI tools are blocked the same way. The ring says "Blocked us".
  - For your own blocked site, it says AI tools may not be able to read it either. It doesn't say to check the address.

### BUG-097 Branch name saved as the business name

- **Done (2026-10-08, with BUG-099 to BUG-102):** detection now counts two shorter forms of every name, the business and each competitor alike (`scanning/mention-text.ts` `brandForms`):
  - the brand before a comma, " - ", "|" or "of <city>" in a Google title ("Radiant Plumbing", "Reliant Plumbing", "Mr. Rooter Plumbing"), never when that part is generic ("Plumbing - Austin");
  - the leading words that spell the website's name ("Cheezious" on cheezious.com, "Beyond Wow" on beyondwow.com).
  Replaying Beyond Wow's 108 saved answers: Radiant counted in 15 (was 3), Reliant in 18 (was 0), Mr. Rooter in 9 (was 6); every new match checked by hand. Saved results keep their old counts until the next scan.
- **Done in Phase 4:** the details step suggests the brand when the Google name starts with what the website spells ("Is this one branch? Customers may know you as Cheezious. Use Cheezious"), and the name field says to use the name customers know.

- **Seen:** setting up cheezious.com filled the name from Google as "Cheezious Golra Mor Branch". In the next real scan, Claude named "Cheezious" in 2 answers and neither counted, because detection needs the saved name.
- **Fix:**
  - When the Google name starts with the brand from the website or domain ("cheezious"), suggest the brand as the name and keep the branch as an alias, or the other way round.
  - Also count the brand from the domain as an alias when it is distinctive.
  - Add a note on the details step that the name should be the one customers and AI use.

### BUG-088 Competitor search timeout

- **Fix:** 8 seconds instead of 25 (`onboarding/http.ts:5`, `onboarding/dal.ts:117`), and saved competitors load in parallel.

### Phase 4 results (2026-10-08)

- **BUG-084:** `onboarding/question-rules.ts` `fallbackQuestions` is 12 plain questions ("Which clothing store in Rawalpindi has the best reviews?") for any business, used when Claude fails and to top up a short written list. The industry word is our search term ("HVAC contractor") or the user's own words. The old engine (`lib/geo/prompt-engine.ts`) stays only for the legacy `/api/geo/prompts/generate` route. Khaadi's fallback cause could not be traced: that business was removed with the database rebuild, and every business set up since got Claude's questions.
- **BUG-085:**
  - `src/lib/place-label.ts`: questions and scans name the city alone unless the region is a 2 or 3 letter code ("Austin, TX", "Sydney, NSW"; "Rawalpindi", not "Rawalpindi, Punjab"). The full region still goes to the AI as `user_location`. Questions already saved keep their text until edited.
  - Competitor suggestions search the user's own industry words ("Sportswear store in Islamabad"), then the business's Google type, then the first service. The search is biased to a 20 km circle around the business and kept to its Google type, both read live from its place (`competitor-places.ts` `origin`, nothing stored). A type Google refuses is retried without it. Live for Nike, Islamabad: sportswear shops instead of "Athletic footwear" results that included Rawalpindi shoe brands.
  - No retail industry was added: D-62 lists the first 10 industries as Proposed, so a new one needs your approval. Retail already works through "Other" plus the user's words.
- **BUG-086:** `src/lib/countries.ts` holds the country list (written out, since Node and browsers name some countries differently and the select failed hydration) and `countryCode`, now shared with scans. Setup requires a country, prefilled from auto-fill; Settings shows and saves it. Both save the ISO code.
- **BUG-087:** auto-fill keeps the page results when no page was readable (`facts: null`). The facts give `yourWebsite.readStatus` (read, blocked, unreachable); the fallback writer says "Your website blocks automated readers, which may include AI" with steps to allow GPTBot, ClaudeBot and PerplexityBot; the prompt forbids "build a website" for a business with one, and `claims.ts` `websiteIssues` drops a reason that says it. The checklist skips "Build a simple one-page website" when there is a website.
- **BUG-088:** competitor calls time out after 8 seconds (`COMPETITOR_TIMEOUT_MS`).
- **BUG-096:** `readiness-check/failure.ts`: 401, 403, 429, 503 and bot challenge pages are "blocked"; other failures "unreachable". Live: adidas.com blocked, nike.com, khaadi.com and beyondwow.com read, beyondwow.comf unreachable. The result says "adidas.com turns away automated readers like ours, so only your site was checked", the ring says "Blocked us", with a note that AI tools may be turned away too. Your own blocked site is never told to check the address.
- **Found while testing:** the Google Places key has a limit of 100 place lookups a day (`GetPlaceRequest per day`), and it was used up on 2026-10-08. Saved competitors, the new location lookup and the fixes page all use place lookups. Raise the quota in Google Cloud before launch (Phase 6).

## Found in launch testing (2026-10-08), fixed before Phase 4

Beyond Wow Plumbing & Drains (beyondwow.com, Austin). Checked by replaying the real scan's answers and citations, the two bad fixes word for word, and the website step in the browser at 1440px and 390px.

### BUG-099 A fix gets the Google rating backwards

- **Seen:** "4.9 is lower than 4.5 at Clarke Kent, 4.8 at Mr. Rooter…". Beyond Wow's 4.9 beats all four; only the open-days part was true.
- **Cause:** each competitor's facts said `rating: "lower"`, meaning *their* rating is lower. The model read it as the owner's.
- **Fix:**
  - `insights/compare.ts` `sideOf`: Google comparisons are said from the owner's side, `they_are_ahead`, `you_are_ahead`, `about_same`, `unknown`.
  - Prompt (`explain.v2`, not yet released): a "you trail" reason only where that competitor is `they_are_ahead`.
  - `insights/claims.ts` `comparisonIssues`: a sentence that says the business trails on reviews, rating or open days must match the facts for every competitor it names, or for at least one when it names none; otherwise the reason is dropped. The reported reason now fails with "says Clarke Kent Plumbing is ahead on Google rating, but it is not"; a true "open more days than you" reason passes.

### BUG-100 A fix points to other businesses' websites as listing sites

- **Seen:** "check your listing on abchomeandcommercial.com and coldisontheright.com", both plumbers' own websites.
- **Fix:**
  - The site classifier moved to `src/lib/site-type.ts` (shared with the Sources page). Each cited site in the facts has `kind` (`listing`, `news`, `business_site`) and `owner` when the domain matches a competitor or a named business (`insights/sites.ts`). statesman.com is now news.
  - Prompt: a listing only on `listing` sites; a business site means the fix is on the owner's own website.
  - `claims.ts` `listingIssues` drops a reason that asks for a listing on a business or news site. The template writer picks only a listing site.

### BUG-101 One brand twice in "Also recommended by AI"

- **Fix:** names group by brand (`also-recommended/names.ts`), so "Abacus Plumbing, Air Conditioning & Electrical" and "Abacus Plumbing" count once per answer. Beyond Wow: one Abacus row, 39 answers.

### BUG-102 A mistyped website is not flagged

- **Fix:** `onboarding/website/domain-check.ts` looks the address and its www. name up before auto-fill. Only "no such name" from DNS blocks (3 second limit); any other DNS error lets setup go on. The message sits on the website field. Fixture mode skips the lookup.

## Phase 5: Stripe sandbox, end to end

Needs sandbox keys in `.env` (empty today). With `stripe listen` and a test clock, run:
- checkout with a trial
- trial end and renewal
- cancel
- buying credits
- adding a second business (prorated)

Check that `credit_grants` and `business_billing_items` are right and that a replayed webhook changes nothing.

### Phase 5 results (2026-10-08, sandbox "customer.direct sandbox", local app with `stripe listen`)

Setup found:
- `.env` has a restricted test app key and a test publishable key. `STRIPE_WEBHOOK_SECRET` is not set (the local run used the CLI's secret). The sandbox had no products or prices.
- The app key cannot create products (Products Write), as intended. The catalog was synced with the app's own sync logic, writes through the logged-in Stripe CLI: `cd_plan_starter` $149, `cd_plan_pro` $249, `cd_topup_500` $50, `cd_topup_2000` $180; `catalog-check` passes. The IDs are saved in the local dev database only; staging and live need the same sync with a catalog key.
- The sandbox shows Bank, Cash App Pay and Amazon Pay next to cards; Apple Pay needs the domain registered.

| Flow | Result |
|---|---|
| Card step: decline (`0002`), insufficient funds (`9995`) | Works: clear messages, nothing created |
| Card step: `4242` | Works: subscription trialing, trial end saved, 100 trial credits, first scan screen. No plan row for the business (BUG-104) |
| Choose plan, 1 business | Works, same missing plan row (BUG-104) |
| Choose plan, 2 businesses | Broken: Stripe refuses, blank form (BUG-103) |
| Buy 500 and 2,000 credits | Credits granted once, never expire. The page reports "taking longer than usual" (BUG-105) |
| Cancel, then keep | Works: `cancel_at` set and cleared, notice says a cancelled trial is not charged |
| Manage card and invoices | Works: opens billing.stripe.com |
| Trial end (`trial_end: now`) | Works: $149 charged, active, 1,200 plan credits until the period end |
| Payment fails (`pm_card_chargeCustomerFail`) | Agency past due and the banner shows; the handler fails on email settings (BUG-106) |
| Add a business already paying on another plan | Double billing, $398 for one business (BUG-104) |
| Replayed `invoice.paid` | Works: no second grant |
| `trial_will_end` | Fails without email settings (BUG-106) |

Left in the sandbox for review: test customers `p5-*@example.test` (one with the $398 double item), and their agencies in the local dev database.

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

- Google Places: raise the "GetPlaceRequest per day" quota (it is 100 a day and ran out during testing on 2026-10-08).

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
