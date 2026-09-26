# Phase 10: Launch readiness

Goal: everything measured, safe, legal and rehearsed before real customers pay. Ends with **Milestone 3: complete product, ready to launch**. [Back to index](./README.md)

---

### B-75 Evals complete with baselines
- [ ] Done

Phase 10 · M · Depends on: B-24, B-25, B-33, B-34, B-51, B-52 · Blocked by Jordan: no · MVP_SPEC 25, D-66, D-81 · Branch: `task/B-75-evals-complete-with-baselines` → `mvp`

**Build**
1. Confirm all six suites exist with human-labelled datasets and READMEs (who labelled, when, source, PII notes).
2. Run every suite; commit one baseline result per suite in `evals/results/`.
3. Set the pass levels in each suite from the baseline (above the noise, MVP_SPEC 25 principle 8).
4. Confirm `eval-fast.yml` and `eval-ai.yml` run on the right triggers.
5. Weekly sample for human review: 10 random explanations and auto-fills listed in admin.

**What the user sees**
- Nothing directly; scores, auto-fill and advice stay reliable as prompts and models change.

**Engineering checks**
- Launch gate: mention detection at least 95%; auto-fill with zero invented fields; explanations at least 90% on the calibrated grader; baselines committed.

---

### B-76 Calibration check against the real AI apps
- [ ] Done

Phase 10 · S (human, 1 to 2 hours) · Depends on: B-26 · Blocked by Jordan: no · MVP_SPEC 5.6, D-66 · Branch: `task/B-76-calibration-check` → `mvp` (results file only)

**Build**
1. Pick 20 real questions across 2 to 3 cities.
2. A person asks them in the ChatGPT, Claude and Perplexity apps and records which businesses are named (spreadsheet or admin form).
3. Run the same questions through our checks; compute the agreement rate per model.
4. Fix large gaps (usually location). Put the agreement rate in the "How we measure" panel (B-57).
5. Calendar reminder to repeat every 3 months or after a major model change.

**What the user sees**
- "Tested against the real ChatGPT, Claude and Perplexity apps" in the "How we measure" panel, with the agreement rate.

**Engineering checks**
- Results saved in `docs/calibration/2026-XX.md`.

---

### B-77 Account management and deletion
- [ ] Done

Phase 10 · L · Depends on: B-44, B-55 · Blocked by Jordan: legal deadlines (D-77) · MVP_SPEC 23, MVP_ROADMAP ACC-01 to ACC-04 · Branch: `task/B-77-account-management-and-deletion` → `mvp`

**Build**
1. Change email and change password in Settings (`supabase.auth.updateUser`).
2. Email confirmation on in Supabase; password reset links go through `/auth/callback?next=/reset-password`.
3. Delete a business: removes its subscription item at period end, soft deletes, permanent deletion after 30 days.
4. Delete account: confirm by typing the agency name; cancel Stripe immediately; status `deleted`; login blocked, scans stopped, share links revoked; permanent deletion after 30 days by pg_cron (businesses, questions, results, logos, auth user); `credit_transactions` anonymised; emails at each step.
5. Admin restore within 30 days (B-65).

**What the user sees**
- They can change their email or password without contacting support.
- They can delete a business or the whole account themselves, with a clear warning and a confirmation email.

**Engineering checks**
- Tests: soft delete blocks login; the 30-day job removes the data and the auth user; ledger rows anonymised, not deleted.

---

### B-78 Terms and privacy update
- [ ] Done

Phase 10 · S (plus legal review) · Depends on: B-45 · Blocked by Jordan: lawyer or Jordan review · MVP_SPEC 24, D-78 · Branch: `task/B-78-terms-and-privacy-update` → `mvp`

**Build**
1. Draft the changes listed in MVP_SPEC 24 in plain language.
2. Send to Jordan (and a lawyer) for review; apply their edits.
3. Show a short trial and renewal summary next to the card form (B-41) that links to the terms.

**What the user sees**
- Clear, honest terms about the trial, charges, credits, refunds, AI data use and cancellation.

**Engineering checks**
- Review sign-off recorded in DECISIONS.md under D-78.

---

### B-79 Google Places compliance check
- [ ] Done

Phase 10 · S · Depends on: B-35, B-50 · Blocked by Jordan: legal reading (D-73) · MVP_SPEC 26, D-73 · Branch: `task/B-79-google-places-compliance-check` → `mvp`

**Build**
1. Remove any Places data stored by old code (competitor names from `source: google_places` that the user never confirmed; any ratings or reviews), keeping `place_id`.
2. Search the codebase and database for Places fields other than `place_id` being written; fix any found.
3. Confirm Google attribution appears everywhere Places data is shown (Competitors page, onboarding, share page, PDF).
4. Record the lawyer's or Jordan's confirmation of our reading of the terms.

**What the user sees**
- Google ratings and reviews shown with Google's attribution.

**Engineering checks**
- Database query shows no stored Places fields other than `place_id`; screenshots of attribution in the PR.

---

### B-80 Go live on the chosen host
- [ ] Done

Phase 10 · M · Depends on: all build tasks, B-01 · Blocked by Jordan: Stripe live account; DNS only if moving to Vercel · MVP_SPEC 20, D-41, D-70 · Branch: `mvp` → `main` (the go-live merge itself; pull request from `mvp`)

**Build**
- **Netlify path** (if the Netlify tests in B-08 and B-27 passed):
  1. Put the rotated production keys in the Netlify environment (production context).
  2. Deploy the worker as a background function; point the pg_net worker URL and the Stripe live webhook at the production domain.
  3. Check Supabase Auth site URL and redirect URLs, Google OAuth redirect URIs.
  4. Merge `mvp` into `main` through a pull request (all checks green); Netlify publishes it.
- **Vercel path** (only if the Netlify tests failed): follow MVP_SPEC 20 steps 1 to 6.
- Both: switch Stripe from sandbox to live keys and live price IDs; point the worker URL at production and let the daily enqueue include real agencies (B-28).

**What the user sees**
- The new product is live at the normal address with no downtime.

**Engineering checks**
- One real signup, card payment (then refunded) and scan on production with an internal account.
- Rollback plan written in the PR (previous deploy or DNS back).

---

### B-81 Existing users at launch
- [ ] Done

Phase 10 · S · Depends on: B-14, B-45 · Blocked by Jordan: decision on beta users · MVP_SPEC 19, D-69 · Branch: `task/B-81-existing-users-at-launch` → `main`

**Build**
1. Apply Jordan's decision (proposed: a fresh 7-day trial with 100 credits for existing beta users).
2. Email existing users: what changed, the new pricing, how to continue.

**What the user sees**
- Existing users get a clear email and a fair way to continue.

**Engineering checks**
- Each existing agency has the expected status and credits (verification query in the PR).

---

### B-82 Security and resilience hardening
- [ ] Done

Phase 10 · M · Depends on: B-59, B-71, B-73 · Blocked by Jordan: no · MVP_ROADMAP SEC-03 to SEC-07, REL-06, REL-08 · Branch: `task/B-82-security-and-resilience-hardening` → `mvp`

**Build**
1. Security headers in `next.config.ts`: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`, a Content Security Policy (start in report-only, then enforce).
2. Logo upload: accept PNG, JPG and WebP only (no SVG), check file signatures, size limit.
3. `images.remotePatterns`: only our Supabase storage host.
4. Any remaining server-side fetch of user URLs (compare tool) goes through one safe-fetch helper: DNS resolution, private IP ranges blocked (IPv4 and IPv6), redirects re-checked.
5. Rate limits on public endpoints (contact, leads, compare) in a shared store.
6. Branded `not-found.tsx`, `global-error.tsx`, and `error.tsx` plus `loading.tsx` under the app.
7. Client-side handling of expired sessions: redirect to login and return to the same page.

**What the user sees**
- Friendly error and 404 pages instead of plain default ones.
- When a session expires, they are sent to log in and brought back to where they were.

**Engineering checks**
- `curl -I` shows the headers; SSRF tests (private IP, redirect to private IP) blocked; upload tests reject SVG and fake PNGs.

---

### B-83 Launch rehearsal
- [ ] Done

Phase 10 · M · Depends on: B-75 to B-82 · Blocked by Jordan: no · All · Branch: `task/B-83-launch-rehearsal` → `main`

**Build**
1. Run the full Playwright suite against production with an internal test agency.
2. Walk through every phase's demo checklist on production (desktop and phone).
3. Confirm alerts, backups and pg_cron jobs are running on production.
4. Confirm the "Ask Jordan" list in DECISIONS.md is fully answered.
5. Write a one-page launch note: what is live, known limitations, who to contact.

**What the user sees**
- A product that works end to end on the first day real customers arrive.

**Engineering checks**
- All CI, evals and end-to-end tests green on production; every demo checklist ticked.

---

## Phase 10 demo checklist (Milestone 3)

1. On the live site, sign up as a new customer with a real card (refunded afterwards): pricing, setup, card, trial, first scan, dashboard.
2. Check each dashboard page, share a report, export a PDF.
3. Receive the welcome email; the admin receives no unexpected alerts.
4. Change your password, then delete a test business.
5. Open "How we measure": it shows the calibration result.
6. Read the new Terms and Privacy pages: trial, charges, credits and AI use are clear.
7. As an admin: see the new customer, their credits and the AI cost.
