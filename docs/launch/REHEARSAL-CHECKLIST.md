# Pre-launch rehearsal checklist

A click-through of the whole product before go-live (B-83 prep). Every line comes from a task's "What the user sees" list or a phase demo checklist in `docs/build-plan/`, plus a few audit checks. Ticked as the walk goes.

## How it is run

- Code: `mvp` at e29fd07, walked on 2026-10-06.
- App: `next dev` on this Mac against the local test database (`.env.test.local`), with `ONBOARDING_FIXTURES`, `PLACES_FIXTURES`, `STRIPE_CHECKOUT_FIXTURES` and `WORKER_IN_PROCESS`. Scans use recorded answers (an `is_test` agency, D-61). No real AI, Places, Stripe or email cost.
- Emails: caught by the local mail viewer, not sent.
- Driver: Playwright, at 1440px (desktop) and 390px (phone). Screenshots are kept locally, not committed.
- Each page is also checked for: console errors, failed requests (4xx or 5xx), long dashes or banned words in the text, and anything cut off at 390px.

Marks: `[x]` works, `[!]` bug (logged in `docs/BUGS.md`), `[-]` cannot be checked locally (reason given; moves to the production rehearsal after B-80).

## Before launch, outside this walk

- [x] Typecheck, lint and build pass on `mvp` (2026-10-06).
- [x] Unit tests: 1081 of 1083 pass; the 2 failures pass alone (BUG-069).
- [x] Playwright suite: 139 of 146 pass, 3 skipped; the 4 failures pass alone (BUG-068).
- [-] Real AI, Stripe live, real email delivery, pg_cron on production: production rehearsal after B-80.

## 1. Public site (phase 1 and 9)

- [x] Homepage loads, desktop and phone; says plainly what the product does.
- [x] Nothing mentions Gemini, AI Employee, ads or fake reviews; examples are labelled "Example".
- [x] Header and footer the same on every public page; phone menu opens and closes.
- [x] Old links `/ai-employee`, `/dm-ads`, `/ads`, `/call-bar`, `/sales` go to the homepage.
- [x] Pricing: prices, credits and trial terms clear; "Choose plan" goes to signup.
- [x] Agency page loads and reads clearly.
- [x] Contact page: form only offers AEO topics; sending shows a clear result.
- [x] Free compare tool: result matches what the page promised, with a clear next step.
- [x] Terms and Privacy: trial, charges, credits, refunds, AI data use and cancellation are clear.
- [x] Unknown page shows the friendly 404, not a default one.
- [x] Link preview tags (title, description, image) on the homepage and pricing.

## 2. Sign up and setup (phase 4)

- [x] Sign up with a new email; confirmation email arrives in the mail viewer.
- [x] Welcome email arrives once. (fires once; Resend key blank locally, so not rendered; see section 6.)
- [x] Agency name step.
- [x] Website step: name, address, phone, services and industry fill in by themselves.
- [x] A site that finds nothing shows an empty form with a friendly note, never an error. (goes to the details step with an empty form)
- [x] Competitors step: nearby businesses with Google rating and Google attribution, ready to tick.
- [x] Adding a sixth competitor on Starter shows "Your plan tracks up to 5 competitors."
- [!] Questions read naturally for the industry, not generic. Natural, but the fallback set: no service-based questions ("oat milk lattes") and a few odd ones ("answers the phone fastest"). Expected until B-32 and B-33 are approved.
- [x] Switching daily, weekly and monthly updates the credit estimate at once.
- [x] Progress indicator; closing halfway and coming back continues at the same step.
- [x] "I don't have a website" path completes setup (B-37 is still open; note what happens). (name and city, friendly note when Google finds nothing, setup completes and the first scan runs; the how-to-get-found checklist is B-37, still open)
- [x] Every step fits and works at 390px. (all 7 steps, no sideways scroll)

## 3. Card and trial (phase 5)

- [x] Card step shows the exact trial end date and price, and the trial and renewal summary.
- [x] Test card starts the trial; the first scan begins.
- [x] Declined card shows a clear message and allows another card.
- [x] First scan screen: short progress, then the dashboard with a first score.
- [x] Trial banner shows days and credits left.
- [x] Adding a third business on the trial shows "Your trial includes 2 businesses. Upgrade to add more."
- [-] Trial end charge, failed renewal with card `4000 0000 0000 0341`: needs Stripe test clocks and webhooks, production rehearsal.

## 4. Dashboard (phase 6)

- [x] App frame: six menu items, credit balance always visible; phone menu opens the same items.
- [x] Switching business keeps the same page.
- [x] Overview: one score, label, sentence, trend, per-AI scores, next step.
- [x] "Run scan": shows "Scanning...", updates without a manual refresh; pressing again says "A scan is already running." ("Scanning...", updates by itself; a double click ran one scan and charged 36 once)
- [x] With 0 credits, "Run scan" explains "You're out of credits." (button disabled: "You're out of credits. Buy a top-up or upgrade.")
- [x] Competitors: side-by-side Google rating and reviews with attribution; "also recommended by AI" list with one click to track.
- [x] Opportunities: specific reasons and steps, most important first; "Copy for Claude" copies a prompt; "Done" moves it to Done.
- [x] Questions: the actual questions with how often AI recommended the business; adding one shows the credit change.
- [x] Sources: which websites AI trusts for this business type and city.
- [x] Settings: change scan frequency and see the credit estimate before saving.
- [x] Usage: where credits went, what is left, a forecast.
- [x] "How we measure" panel reads honestly (calibration line waits for B-76). ("How is this calculated?" panel; calibration line waits for B-76)
- [x] Old dashboard bookmarks land on the new pages. (visibility and reports go to Overview, competitors, settings and billing to the new pages; `/dashboard/seo` still opens the empty legacy Search intelligence page, kept on purpose)
- [x] Every page above at 390px.

## 5. Billing (phase 5)

- [!] Billing page: what they pay, for which businesses, the next charge, buttons to change it. Shows the plan and next charge, but a business added after signup is listed as "Not on your plan yet" while it already scans (BUG-071).
- [x] Buy credits: two packs; balance goes up at once, or pays off a negative balance first. (500 for $50, 2,000 for $180; declined card handled; -16 paid back first, 484 left)
- [x] Upgrade shows "You'll pay $X today and get Y extra credits now". (during the trial: "You pay nothing today ... From October 12, 2026 ... $249 a month on Pro")
- [-] Downgrade or remove a business says "Takes effect on [date]. No refund." Needs two businesses on the plan; blocked by BUG-071 in this walk. Covered by billing.spec.ts.
- [x] Cancel says when access ends and that plan credits work until then. ("Your trial credits work until then. Your card won't be charged.")
- [x] "Manage card and invoices" opens the Stripe portal: needs real Stripe sandbox keys. (fixture portal opens; the real Stripe portal needs sandbox keys)

## 6. Reports and emails (phase 7)

- [x] Share: link opens in a private window with the agency logo, no login. (agency name shown; no logo was uploaded)
- [x] Turning the link off: "This report link is no longer active."
- [-] Export PDF downloads within a few seconds and matches the share page. Needs BROWSERLESS_API_KEY, blank here on purpose. Failure shows "PDF could not be created. Try again, or use Print, Save as PDF." Check on staging.
- [x] Trial ending, payment failed and low credits emails each arrive once and read clearly (triggered by hand). (all 6 templates rendered in the email preview: plain, no long dashes, banned words or emoji; "arrives once" is covered by unit tests. The logo loads from customers.direct and 404s until mvp is live.)
- [x] Monday summary email arrives with scores and a link (job run by hand). (rendered in the preview; the job itself runs on pg_cron, production rehearsal)

## 7. Account (phase 10)

- [x] Change email and password without support. (password changed, old one refused; email change waits for a click in both inboxes)
- [x] Delete a business: clear warning, confirmation email. (typed-name confirm, dates for now, period end and permanent removal; "We emailed you the details")
- [x] Delete the whole account: clear warning, confirmation email. (typed-name confirm; lands on "This account was deleted"; logging in again shows the same page)
- [x] Expired session sends to login and back to the same page.
- [x] Logged-out visitor opening the dashboard goes to login and comes back after.
- [x] Suspended agency sees "Your account is paused, contact support".

## 8. Admin (phase 8)

- [x] Normal user opening `/internal/admin` goes back to the dashboard; no admin link for them.
- [x] Admin: six menu items. (six, plus Leads, Feature requests and LinkedIn studio in a second group, kept on purpose)
- [x] Overview: customers, revenue, AI cost and alerts on one screen. (test agencies are left out, so the numbers are 0 locally)
- [x] Agency: add 50 credits with a reason; balance changes and the action is in the log.
- [x] Extend a trial by 3 days; suspend and unsuspend.
- [x] Business page: everything on one page, rescan button. (button is "Run scan now"; a second press says a scan is already queued)
- [x] Scans: retry a failed test scan.
- [x] Usage and Cost: cost per model and margin. (layout and margin rule shown; no numbers since test agencies make no real calls)
- [x] System status page: every service shown as connected or not. ("2 of 10 services working" because the keys are blank here)
- [-] Failure spike alert email: needs pg_cron and the alerts URL, production rehearsal.

## 9. Credits rules (phase 2 and 3)

- [x] A 12-question, 3-model scan lowers the balance by exactly 36. (200 to 164)
- [x] Double-clicking "Run scan" runs one scan and charges once.
- [x] An agency with 5 credits: the scan finishes, balance -31, out-of-credits banner, next scan blocked. (20 credits, 36-credit scan: finished at 16 over, banner, Run scan blocked)
- [x] A 500-credit top-up then shows 469. (484 after 16 over)
- [-] A failed provider check is not charged and the scan still shows a result. Needs one provider to fail mid-scan with real keys; covered by the credit unit tests (B-13).

## Findings

Bugs found in this walk, with their BUGS.md ID.

| Item | What happened | Bug |
|---|---|---|
| Trial dates (3) | Card step shows the trial end in the viewer's time zone, the banner in UTC, so they can differ by a day. | BUG-070 |
| Billing (5) | A business added after signup is never added to the plan, yet it scans from the shared credits. | BUG-071 |
| Test mode (4) | Recorded answers are matched by shared words across industries, so a coffee shop gets plumber and dentist names. | BUG-072 |
| Pricing (1) | Site shows Starter $149 and Pro $249; Jordan's launch doc says $199 a month. Prices are not decided yet (D-21). | Decision, not a bug |
