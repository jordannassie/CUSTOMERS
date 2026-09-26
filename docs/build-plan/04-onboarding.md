# Phase 4: Onboarding

Goal: a new user goes from account to first scan with almost no typing, following MVP_SPEC 3.1. The card step (step 8) is added in phase 5 (B-41); until then test agencies skip it. [Back to index](./README.md)

---

### B-32 Industry question library
- [ ] Done

Phase 4 · L · Depends on: B-11 · Blocked by Jordan: no · MVP_SPEC 5.3, D-62 · Branch: `task/B-32-industry-question-library` → `mvp`

**Build**
1. Industry list (the enum used everywhere): the first 10 from D-62 (dentist, lawyer, restaurant, coffee shop, plumber, HVAC, med spa, real estate, auto repair, salon) plus `other`.
2. Script `scripts/generate-question-library.ts`: Claude Sonnet drafts about 40 templates per industry with `{city}`, tags (services) and intent (best, urgent, price, reviews, comparison). Output to `supabase/seed/question-library.v1.json` for review.
3. **Human review**: a person reads every template, fixes wording, removes weak ones, and approves. Record the reviewer and date in the file.
4. Migration or seed loads the approved templates into `question_library` with `version = 1`.

**What the user sees**
- Nothing yet; in B-36 a dentist gets natural dentist questions ("Which dentist in Orange, CA offers emergency appointments?") instead of "best Digital marketing agency".

**Engineering checks**
- Every template has `{city}`, at least one tag and one intent (validation script).
- Human review recorded.

---

### B-33 Question picking and its eval
- [ ] Done

Phase 4 · M · Depends on: B-32 · Blocked by Jordan: no · MVP_SPEC 5.3, 25 · Branch: `task/B-33-question-picking-and-its-eval` → `mvp`

**Build**
1. `src/modules/onboarding/questions.ts`: Claude Haiku picks 12 templates from the business's industry library that fit its services, with a mix of intents; fills `{city}`.
2. Industry not in the library: Haiku writes 12 questions following the same rules; the industry is flagged in admin as a library candidate.
3. Fallback to the old template engine only if the AI call fails.
4. Prompt in `src/modules/onboarding/prompts/pick-questions.v1.ts`.
5. Eval `evals/question-picking/`: 20 to 30 sample businesses with an acceptable pool labelled by a person; overlap score.

**What the user sees**
- A coffee shop that lists "oat milk lattes" and "open early" gets questions about those, not generic ones.

**Engineering checks**
- Eval overlap at least 0.8; result pasted in the PR.

---

### B-34 Business auto-fill and its eval
- [ ] Done

Phase 4 · L · Depends on: B-15 · Blocked by Jordan: no · MVP_SPEC 3.2, 26, D-18, D-73 · Branch: `task/B-34-business-auto-fill-and-its` → `mvp`

**Build**
1. `src/modules/onboarding/autofill.ts`, run in parallel:
   - Firecrawl scrape of `/`, `/about`, `/about-us`, `/contact` (markdown, main content only).
   - Google Places Text Search by domain, then by name plus city; field mask limited to the fields we use.
2. Claude Haiku with structured output returns name, industry (enum), description, services, city, state, country, phone, address, confidence. Rules from MVP_SPEC 3.2 (never invent; Places wins for name, address, phone, category; website wins for description and services).
3. Retry once with Claude Sonnet if name or industry is empty or confidence is low.
4. Only `place_id` is stored from Places; the other values only pre-fill the form (D-73).
5. Save the business's own site facts to `business_site_facts`.
6. Eval `evals/business-autofill/`: 30 to 50 real businesses (including Cloudflare-protected sites like brandastic.com) with correct fields labelled by a person; schema check plus "nothing invented" check.

**What the user sees**
- Entering a real coffee shop website fills in name, address, phone, services and industry in a few seconds.
- For a site that blocks scanners, the form still fills from Google where possible.
- If nothing is found, an empty form appears with a friendly note, never an error.

**Engineering checks**
- Eval: schema 100%, zero invented fields; result pasted in the PR.

---

### B-35 Competitor discovery
- [ ] Done

Phase 4 · M · Depends on: B-34 · Blocked by Jordan: no · MVP_SPEC 3.1 step 5, 7.1, D-73 · Branch: `task/B-35-competitor-discovery` → `mvp`

**Build**
1. `src/modules/onboarding/competitors.ts`: Google Places search for the same category near the business; returns up to 10 candidates with live name, rating and review count for display.
2. The user ticks, removes or adds (by name, with an optional Places lookup). Limits from `maxCompetitors` (5 Starter, 10 Pro).
3. Store the confirmed names (user input) and `places_id` only.
4. Show Google attribution wherever Places data is displayed.

**What the user sees**
- Real nearby competitors appear with their Google rating, ready to tick.
- Trying to add a sixth on Starter shows "Your plan tracks up to 5 competitors."

**Engineering checks**
- No Places ratings, reviews or addresses saved (test checks the stored row).

---

### B-36 Onboarding wizard
- [ ] Done

Phase 4 · L · Depends on: B-09, B-33, B-34, B-35, B-16 · Blocked by Jordan: no · MVP_SPEC 3.1, D-14, design/DESIGN.md · Branch: `task/B-36-onboarding-wizard` → `mvp`

**Build**
1. Route `src/app/(app)/onboarding/[step]/page.tsx` with steps: agency name and optional logo, website (or "I don't have a website"), details (auto-filled), competitors, questions (edit, remove, add up to 25), AI models and frequency.
2. Models step shows the plain-language model explanations from MVP_SPEC 4.5 and a live credit estimate (`estimateMonthlyCredits`) while choosing daily, weekly (default) or monthly.
3. Each step saves through a Server Action and updates `onboarding_step`; returning users resume where they stopped; no duplicate draft businesses.
4. Selected plan from the pricing page carried through (`?plan=`) and stored on the agency.
5. Adding a second business later runs the business steps only.
6. All states designed: loading while auto-fill runs, empty, errors, mobile layout.

**What the user sees**
- A calm, step-by-step setup with a progress indicator, mostly pre-filled, that works on a phone.
- Closing the browser halfway and coming back continues at the same step.
- The credit estimate changes instantly when switching between daily, weekly and monthly.

**Engineering checks**
- Playwright end-to-end test of the whole wizard with a test agency, desktop and mobile.

---

### B-37 Businesses without a website
- [ ] Done

Phase 4 · S · Depends on: B-36, B-24 · Blocked by Jordan: confirm the feature (D-08) · MVP_SPEC 3.3, 7.3 · Branch: `task/B-37-businesses-without-a-website` → `mvp`

**Build**
1. "I don't have a website" skips Firecrawl; Places searched by name plus city.
2. Details step asks for name, industry, city, state, phone and address.
3. `has_website = false` so mention detection uses name plus city plus phone (B-24) and Opportunities show the "get found by AI" checklist (B-52).

**What the user sees**
- A business with no website can finish setup and get a first scan, followed by a clear checklist of how to get found.

**Engineering checks**
- End-to-end test of the no-website path.

---

### B-38 First scan screen
- [ ] Done

Phase 4 · S · Depends on: B-36, B-29 · Blocked by Jordan: no · MVP_SPEC 3.1 step 9 · Branch: `task/B-38-first-scan-screen` → `mvp`

**Build**
1. After the last step (and after the card step once B-41 exists), queue the first scan and show a progress screen that polls `getScanStatus`.
2. Friendly copy while waiting ("Asking ChatGPT, Claude and Perplexity about your business…"), then open the dashboard.
3. If the scan fails, show a retry button instead of an empty dashboard (fixes MVP_ROADMAP REL-05).

**What the user sees**
- A short, clear progress screen, then the dashboard with the first score.

**Engineering checks**
- End-to-end test including a forced failure and retry.

---

## Phase 4 demo checklist

1. Sign up with a new email (test agency).
2. Enter an agency name.
3. Enter a real coffee shop website: name, address, phone and services fill in by themselves.
4. Competitors appear: real nearby coffee shops with Google ratings.
5. The questions read naturally and are about coffee, not "best Digital marketing agency".
6. Choose weekly scans: the credit estimate updates as you switch options.
7. The first scan runs and the dashboard opens with a score.
8. Repeat on a phone: every step fits and works.
9. Repeat with "I don't have a website": setup still completes.
