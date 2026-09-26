# Phase 6: Dashboard

Goal: the six-page customer dashboard from MVP_SPEC 8, in the DESIGN.md look, in plain language. [Back to index](./README.md)

All pages: server components reading through each module's `dal.ts`; mutations through Server Actions; every state designed (loading skeleton, empty, error); desktop and phone layouts; wording from MVP_SPEC 8.4.

---

### B-48 App shell
- [ ] Done

Phase 6 · M · Depends on: B-09, B-15, B-13 · Blocked by Jordan: no · MVP_SPEC 8.1, 8.2, D-31, D-33

**Build**
1. `src/app/(app)/layout.tsx`: sidebar with Overview, Competitors, Opportunities, Questions, Sources, Settings; business switcher; usage widget; "Suggest a feature"; sign out.
2. Usage widget (`components/app/UsageWidget.tsx`): "620 of 1,200 credits used", progress bar, "Renews in 12 days"; trial version "Trial: 5 days left, 64 of 100 credits left"; red state with "Buy credits" when negative or 0.
3. Phone: sidebar becomes a sheet opened from a top bar.
4. Global banners slot: trial, past due, out of credits, suspended.
5. Remove the non-working "Find anything…" button (a business search can come later).

**What the user sees**
- A clean, calm app frame with six clear menu items and their credit balance always visible.
- On a phone, a menu button opens the same navigation.
- Switching business keeps them on the same page for the other business.

**Engineering checks**
- Playwright: navigation, switcher and widget states (normal, trial, 0, negative).

---

### B-49 Overview page
- [ ] Done

Phase 6 · L · Depends on: B-48, B-30, B-29 · Blocked by Jordan: no · MVP_SPEC 5.6, 8.1, D-63 to D-65

**Build**
1. `src/app/(app)/dashboard/page.tsx`:
   - Score card (`ScoreRing`): the 30-day visibility score, confidence label, and the sentence "AI recommended you in about 6 of 10 customer questions this month."
   - Up or down arrow only when the change is larger than the margin.
   - 7-day trend chart (shadcn chart), per-model scores with model colours.
   - Top 3 opportunities (link to Opportunities).
   - Last scan time, "Run scan" button (B-29) with "Scanning…" state.
   - Export PDF and Share buttons (wired in B-60 and B-59).
2. First-scan state: "First results. Accuracy improves with every scan."
3. "How is this calculated?" opens the details panel (B-57).
4. Remove "Share of Voice", "Market Rank" and "Direct Score" cards.

**What the user sees**
- One clear number, one label, one sentence, a trend, per-AI scores, and what to do next.
- After pressing "Run scan", the page updates when the scan finishes without a manual refresh.

**Engineering checks**
- Playwright with a test agency at three stages: no scans yet, first scan, 30 days of history.

---

### B-50 Competitors page
- [ ] Done

Phase 6 · L · Depends on: B-49, B-35, B-25 · Blocked by Jordan: no · MVP_SPEC 7.1, 8.1, D-64, D-73

**Build**
1. `src/app/(app)/competitors/page.tsx`:
   - Leaderboard: the business (blue) and competitors (greys) by visibility score; "ahead", "behind" or "about the same" using the margin.
   - Side-by-side signals fetched live from Google Places (rating, review count, categories, website, hours) with Google attribution; never stored (D-73).
   - "Also recommended by AI": businesses AI named that are not tracked, with how often, and a button to track one.
   - Manage list: add or remove competitors within the plan limit.
2. Cache Places responses only in memory for the request (no database storage).

**What the user sees**
- "Bean House: 320 Google reviews, 4.7 stars. You: 12 reviews, 4.2 stars" next to each other.
- A list of businesses AI keeps recommending that they had not thought of, with one click to track them.

**Engineering checks**
- Test: no Places data written to the database after loading the page.
- Playwright with a test agency.

---

### B-51 "Why competitors win" explanations and their eval
- [ ] Done

Phase 6 · L · Depends on: B-50, B-26 · Blocked by Jordan: no · MVP_SPEC 7.2, 25, D-30, D-73

**Build**
1. `src/modules/insights/explain.ts`: after each scan, Claude Sonnet 5 (`claude-sonnet-5`, structured output) receives the business's and top competitors' signals: scan results, AI citations, the business's own site facts, and Places values as placeholders only.
2. Returns 3 to 5 reasons, each with title, evidence, why it matters, steps, impact, and a "Copy for Claude" prompt when the fix is on the website. Stored as opportunities with placeholders such as `{competitor.review_count}`, filled in live at display time.
3. Prompt in `src/modules/insights/prompts/explain.v1.ts`. The fixed rules in `opportunity-engine.ts` stay as the fallback.
4. Eval `evals/why-competitors-win/`: 20 to 40 cases labelled by a person; AI grader (Claude Haiku, a different model from the writer) with a pass/fail checklist (uses only given facts, specific, actionable, no invented numbers), calibrated to at least 90% agreement with the human labels before use.

**What the user sees**
- Specific reasons they are not recommended ("Daily Grind has 320 reviews, you have 12"; "AI cites Yelp for coffee in Orange, CA and you are not listed there") and concrete steps.

**Engineering checks**
- Eval pass rate recorded; grader calibration recorded; results pasted in the PR.

---

### B-52 Opportunities page
- [ ] Done

Phase 6 · M · Depends on: B-51 · Blocked by Jordan: no · MVP_SPEC 7.2, 7.3, 8.1, D-09

**Build**
1. `src/app/(app)/opportunities/page.tsx`: all fix steps sorted by impact; status open, done, dismissed; "Copy for Claude" button copying the prompt.
2. Businesses without a website, or missing basics: the fixed "get found by AI" checklist from MVP_SPEC 7.3 with tick boxes.
3. Eval `evals/prompt-templates/`: code checks that every "Copy for Claude" prompt has no empty placeholders, a sensible length and correct structure.
4. Remove "Request Fix" (D-05).

**What the user sees**
- A clear to-do list of what to fix, most important first, each with steps and a one-click prompt they can paste into Claude.
- Marking an item done moves it to "Done".

**Engineering checks**
- Prompt-templates eval passes 100%.
- Playwright: copy button, status changes, checklist for a no-website business.

---

### B-53 Questions page
- [ ] Done

Phase 6 · M · Depends on: B-49, B-33 · Blocked by Jordan: no · MVP_SPEC 5.3, 5.6, 8.1

**Build**
1. `src/app/(app)/questions/page.tsx`: the business's questions (library and custom), each with per-model results "Appeared in 3 of the last 4 checks".
2. Add a custom question (max 25 total, `maxQuestions`), edit, pause, remove.
3. Show the credit estimate change when questions are added or removed.

**What the user sees**
- The exact customer questions being asked, and how often AI recommended them for each one.
- Adding a question shows how it changes monthly credit use.

**Engineering checks**
- Playwright: add, pause, remove; limit message at 25.

---

### B-54 Sources page
- [ ] Done

Phase 6 · M · Depends on: B-49 · Blocked by Jordan: no · MVP_SPEC 8.1

**Build**
1. `src/app/(app)/sources/page.tsx`: websites AI cited when answering this business's questions, how often, type (reviews and forums, directories, news, business sites), and whether the business's own site was cited.
2. Plain wording ("Reviews and forums", not "UGC").

**What the user sees**
- Which websites AI trusts for their type of business in their city, so they know where to be listed.

**Engineering checks**
- Playwright with a test agency, including an empty state for a first scan with no citations.

---

### B-55 Settings
- [ ] Done

Phase 6 · M · Depends on: B-48 · Blocked by Jordan: no · MVP_SPEC 8.1

**Build**
1. `src/app/(app)/settings/`: business profile (name, industry, services, city, phone, address, website change warning); AI models and scan frequency with the live credit estimate and model explanations; agency name and logo; links to Billing (B-46) and Usage (B-56); danger zone links for deleting a business or the account (B-77).
2. Show "Signed in with email or Google" (no vendor names).

**What the user sees**
- Everything about their business and account in one place, with the effect on credits shown before saving.

**Engineering checks**
- Playwright: edit profile, change frequency, upload logo.

---

### B-56 Usage page
- [ ] Done

Phase 6 · M · Depends on: B-48, B-13 · Blocked by Jordan: no · MVP_SPEC 8.2, D-33

**Build**
1. `src/app/(app)/settings/usage/page.tsx`: balance split into plan and top-up credits, used this month, by business, by model, forecast to renewal from the scan schedules, scan history with credits per scan, "Buy credits".
2. Data from `agency_credit_balance`, `credit_transactions` and `scan_jobs`.

**What the user sees**
- Where their credits went, what is left, and whether they will run out before renewal.

**Engineering checks**
- Numbers on the page match the ledger for a test agency (test compares both).

---

### B-57 "How we measure" panel
- [ ] Done

Phase 6 · S · Depends on: B-49 · Blocked by Jordan: no · MVP_SPEC 5.6, D-64, D-66

**Build**
1. Sheet opened from "How is this calculated?": margin, number of unique answers, per-model scores, 30-day window, the method in plain words (API with web search and the business's location), and the calibration result once B-76 is done.

**What the user sees**
- An honest, readable explanation of the score for anyone who wants the detail.

**Engineering checks**
- Snapshot test of the panel text.

---

### B-58 Remove the old dashboard
- [ ] Done

Phase 6 · S · Depends on: B-49 to B-56 · Blocked by Jordan: no · MVP_SPEC 17

**Build**
1. Delete the old dashboard pages (visibility, reports, seo, agent-readiness, direct-agent) and the old `src/components/geo/dashboard/*` components replaced by the new ones.
2. Redirect old URLs (`/dashboard/visibility`, `/dashboard/reports`) to the Overview.

**What the user sees**
- Old bookmarks still work and land on the new pages.

**Engineering checks**
- Route crawl script passes; no unused components left (lint for unused exports).

---

## Phase 6 demo checklist

1. Log in to a test agency with 30 days of history.
2. Overview: one score, a label, a plain sentence, a trend and per-AI scores. Press "Run scan": it updates by itself.
3. Competitors: side-by-side Google ratings and reviews, and a list of businesses AI recommends that you do not track.
4. Opportunities: specific reasons and steps; "Copy for Claude" copies a ready prompt.
5. Questions: the actual customer questions, with "appeared in 3 of the last 4 checks".
6. Sources: which websites AI trusts for your business type.
7. Settings: change the scan frequency and see the credit estimate change.
8. Usage: where the credits went and a forecast.
9. Repeat on a phone.
