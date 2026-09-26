# Customers.Direct MVP Spec

How the MVP works, end to end. Built from the choices in [DECISIONS.md](./DECISIONS.md) (IDs like `D-14` point there). Items marked **Proposed** or **Ask Jordan** in DECISIONS can still change; confirm them before building the parts that depend on them.

Related: [CLIENT_REQUIREMENTS.md](./CLIENT_REQUIREMENTS.md) (what the client asked), [MVP_ROADMAP.md](./MVP_ROADMAP.md) (technical fixes).

## Contents

1. [Scope](#1-scope)
2. [Terms](#2-terms)
3. [Signup and onboarding](#3-signup-and-onboarding)
4. [Plans, credits and trial](#4-plans-credits-and-trial)
5. [Scanning engine](#5-scanning-engine)
6. [Background jobs](#6-background-jobs)
7. [Why competitors win and fix steps](#7-why-competitors-win-and-fix-steps)
8. [Customer dashboard](#8-customer-dashboard)
9. [Admin panel](#9-admin-panel)
10. [Emails](#10-emails)
11. [Payments (Stripe)](#11-payments-stripe)
12. [Marketing site](#12-marketing-site)
13. [Data model](#13-data-model)
14. [Infrastructure](#14-infrastructure)
15. [Cost model](#15-cost-model)
16. [Build rules](#16-build-rules)
17. [Removal list](#17-removal-list)
18. [Code structure](#18-code-structure)
19. [Moving existing data](#19-moving-existing-data)
20. [Going live (Netlify or Vercel)](#20-going-live-netlify-or-vercel)
21. [Testing and definition of done](#21-testing-and-definition-of-done)
22. [Alerts](#22-alerts)
23. [Account and business deletion](#23-account-and-business-deletion)
24. [Terms and privacy updates](#24-terms-and-privacy-updates)
25. [AI evals](#25-ai-evals)
26. [Google Places rules](#26-google-places-rules)

---

## 1. Scope

**In the MVP**
- Agency account with many client businesses (one login per agency)
- Onboarding with auto-filled business details, competitors, AI-written questions
- Visibility scans on ChatGPT, Claude and Perplexity with web search
- Overview score, competitor comparison, sources, "why competitors win", fix steps with "Copy for Claude"
- Credits: plans per business, shared agency pool, top-ups, usage widget and page
- 7-day card-required trial
- Export PDF (with agency logo) and read-only share link
- 5 emails, admin panel with credit tools
- Businesses with no website (light version)
- Redesigned homepage and pricing page

**Not in the MVP (later)**
- Team members and roles, client logins, full white-label
- Gemini and Google AI Overviews
- Search Intelligence (DataForSEO), Direct Agent chat, Agent Readiness, Request Fix
- Error tracking, analytics, separate dev database
- Automatic verification of the no-website checklist

---

## 2. Terms

Use these words in code comments, docs and UI.

| Term | Meaning |
|---|---|
| **Agency** | The account. One login. Owns businesses and the credit pool. |
| **Business** | One client business the agency tracks. Has its own plan. |
| **Question** | A customer-style question we ask AI, e.g. "best coffee shop in Orange, CA". (Code name today: prompt / `tracked_prompts`.) |
| **Check** | One question sent to one AI model. Costs 1 credit. |
| **Scan** | All active questions of one business sent to all its chosen models. |
| **Credit pool** | The agency's shared credit balance. |
| **Mention** | The AI answer names the business. |
| **Visibility score** | Share of checks in which the business was mentioned, 0 to 100. |

---

## 3. Signup and onboarding

### 3.1 Flow (D-13, D-14)

| Step | Screen | Notes |
|---|---|---|
| 0 | Pricing page | User picks Starter or Pro. Choice is carried through signup (`?plan=`). |
| 1 | Create account | Email + password or Google. Email confirmation on (Supabase setting). |
| 2 | Agency name | Creates the `agencies` row. Optional logo upload (used on PDF reports). |
| 3 | Business: website | Domain input, or "I don't have a website" link. |
| 4 | Business: details | Auto-filled (3.2). User confirms or edits: name, industry (from fixed list), description, services, city, state, phone, address. |
| 5 | Competitors | Found through Google Places (same category, same area). User ticks, removes or adds. Max 5 on Starter, 10 on Pro. |
| 6 | Questions | 12 picked by Claude Haiku from the industry library (5.3). User edits, removes or adds (max 25). |
| 7 | AI models and frequency | ChatGPT, Claude, Perplexity ticked by default (5.1). Daily / weekly / monthly, default weekly. Live estimate: "About X credits a month". |
| 8 | Card | Our checkout page (11.2). Starts the 7-day trial. No charge today. |
| 9 | First scan | Job queued and started (6.4). Screen shows progress, then opens the dashboard. |

Rules:
- Nothing that costs real money runs before step 8, except the auto-fill (about $0.01 to $0.10) and competitor search.
- The wizard saves after each step (`businesses.onboarding_step`). A returning user resumes where they stopped; no duplicate draft businesses.
- A second business (after onboarding) runs steps 3 to 7 and 9 only. Trial agencies are limited to 2 businesses; a 3rd shows "Upgrade to add more businesses".

### 3.2 Auto-filling business details (D-18)

Run in parallel when the user submits a domain:

1. **Firecrawl**: scrape `/`, `/about`, `/about-us`, `/contact` as markdown (main content only). Pattern taken from `voxtell-ai/apps/api/src/utils/generate-business-description.ts`.
2. **Google Places Text Search**: query by domain, then by the scraped name plus city if needed. Request only the fields we use (field mask) to stay in the cheaper price tier.

Then **Claude Haiku 4.5** (`claude-haiku-4-5`) with structured outputs returns:

```
name, industry (enum from our list), description, services[], city, state,
country, phone, address, confidence: "high" | "low"
```

Rules for the extraction prompt:
- Use only the text provided. Leave a field empty if it is not stated. Never invent.
- Google Places wins for name, address, phone and category. The website wins for description and services.
- Google Places data only pre-fills the form. What is saved is what the user confirms about their own business; from Places we store only `place_id` (D-73, section 26).
- If `name` or `industry` is empty or `confidence` is low, retry once with Claude Sonnet 5 (`claude-sonnet-5`).
- If both sources fail (blocked, not found), show the empty form.

### 3.3 Businesses with no website (D-08)

- Step 3 "I don't have a website" skips Firecrawl. Places is searched by name plus city.
- Step 4 asks for name, industry, city, state, phone, address by hand.
- Mentions are matched on name plus city (plus phone if the answer contains one) (5.5).
- Opportunities show the fixed "get found by AI" checklist (7.3).

---

## 4. Plans, credits and trial

### 4.1 Plans (D-20, D-21: prices are Ask Jordan)

| Plan | Price | Credits per month | Competitors | Max questions |
|---|---|---|---|---|
| Starter | $149 per business | 1,200 | 5 | 25 |
| Pro | $249 per business | 2,500 | 10 | 25 |
| Enterprise | Custom | Custom | Custom | Custom |

- An agency can mix plans across businesses.
- Each business's monthly credits are added to the agency pool at each renewal.

### 4.2 Credits (D-19, D-22 to D-25, D-53 to D-57)

- 1 check = 1 credit, any model, always with web search. Cached answers (5.4) still cost 1 credit.
- **Credits are grants.** Every grant is its own row (13): plan renewal, top-up, trial, promo, admin adjustment, refund. Each has `amount`, `remaining`, `expires_at` (null = never) and `source`.
  - Plan grants expire at the end of the billing period.
  - Top-up grants never expire, but can only be spent while the agency has an active plan or trial.
  - Trial grant: 100 credits, expires at trial end.
- **Spending order**: the grant that expires soonest first; grants that never expire last.
- **Balance** = sum of `remaining` on unexpired grants, minus active holds.
- Top-up packs: 500 credits for $50, 2,000 for $180 (Proposed).

**Hold, charge, release (D-53)**
1. Scan start: the worker calls `hold_credits(agency_id, questions × models, scan_job_id)`.
2. Each successful check (including cache hits): `capture_credit(hold_id, check_id)` turns 1 held credit into a charge.
3. A check that still fails after its retries: its credit is released, never charged.
4. Scan end: `release_hold(hold_id)` returns anything left.

**Running out mid-scan (D-54)**
- A scan may start only if the balance is above 0.
- Once started it always finishes. The hold may push the balance below zero, at most by the cost of that one scan (overdraft).
- A negative balance is paid off automatically from the next grant (renewal or top-up).
- While the balance is 0 or less, no new scan starts (manual: "Not enough credits"; scheduled: skipped, email sent).

**Concurrency (D-55)**
- Credits change only through the SQL functions above. Each locks the agency row (`select ... for update`) and writes in one transaction.
- A unique partial index allows only one `queued` or `running` job per business.
- Every ledger row has a unique `(source_type, source_id)` so a retried job, check or Stripe event can never apply twice.

**Alerts**: email and banner at 80% of the period's credits used, at 0, and when the balance goes negative.

### 4.3 Credit estimate (shown at step 7 and in Settings)

```
credits per month = active questions × chosen models × scans per month
scans per month: daily 30, weekly 4.3, monthly 1
```

Example: 12 questions × 3 models × weekly = about 155 credits a month.

### 4.4 Trial (D-15 to D-17)

- 7 days, card required, 2 businesses, 100 credits (100 is Proposed).
- The plan chosen on the pricing page is charged automatically on day 7 unless cancelled.
- Trial credits are a one-time grant, not added again at the first renewal.
- Cancel during trial: account becomes read-only at trial end; no charge.

### 4.5 Model explanations (shown when choosing models)

| Model | Text |
|---|---|
| ChatGPT | The most used AI. Most of your customers ask here. |
| Perplexity | An AI search engine. Always checks the web and shows its sources. |
| Claude | Growing fast, popular with professionals. |
| On untick | "You won't see whether [model] recommends you. Customers using it are invisible to your report." |

---

## 5. Scanning engine

### 5.1 Models (D-26, D-30)

| Role | Model | Web search |
|---|---|---|
| Check on ChatGPT | `gpt-4.1-mini` (or its current cheap equivalent) via the **Responses API** | `web_search` tool with `user_location` |
| Check on Claude | `claude-haiku-4-5` | `web_search_20250305` tool with `user_location` |
| Check on Perplexity | `sonar` | Always on; `web_search_options.user_location` |
| Auto-fill, question writing | `claude-haiku-4-5` | No |
| "Why competitors win" | `claude-sonnet-5` | No |

Current code: only the first configured provider runs (`src/lib/geo/run-visibility.ts:58`), no web search on OpenAI or Claude, Claude pinned to the old `claude-3-5-haiku-20241022`, no request timeouts. All of that changes.

Live test on 2026-09-26 ("best coffee shop near me", location Orange, CA): `gpt-4o-mini` did not search and asked for a location (not usable); `gpt-4.1-mini` searched and returned real local shops (about 8,000 input tokens, about $0.03 per check); `gpt-5-mini` also worked but used about 30,000 input tokens. OpenAI location only works in the Responses API, not the older Chat Completions search models. Claude and Perplexity location support is confirmed in their docs; not tested live because `.env.local` has no Anthropic or Perplexity key (D-67, D-68).

### 5.2 One check

1. Build the question text with the business city, and pass the business location (city, region, country) as the web search `user_location` for every model (D-67).
2. Look up the cache (5.4). On a hit, reuse the answer.
3. Otherwise call the model with web search, 30-second timeout, 2 retries with backoff on 429 and 5xx.
4. Save the answer, citations (source URLs), model, latency and our real cost.
5. Detect mentions (5.5) for the business and every competitor, and extract every business name the answer mentions with Claude Haiku ("Also recommended by AI", D-74). The extraction is stored with the cached answer, so a cache hit reuses it for free; scheduled scans send extractions through Anthropic's Message Batches API (half price).
6. Deduct 1 credit (ledger row) and write a `usage_events` row with the real API cost.

Checks inside a scan run in parallel (limit 4 to 6 per scan).

### 5.3 Questions: industry library (D-28, D-29, D-62)

**Library**
- Table `question_library`: for each industry, about 40 reviewed question templates with a `{city}` placeholder, e.g. "What is the best dentist in {city}?", "Which dentist in {city} offers emergency appointments?".
- Each template has tags (service, intent: best / urgent / price / reviews / comparison) so the right ones can be picked.
- Written once per industry by Claude, reviewed by a person, stored with a version. Changing a template creates a new version; old scan results keep pointing to the version they used.
- First 10 industries (Proposed): dentist, lawyer, restaurant, coffee shop, plumber, HVAC, med spa, real estate, auto repair, salon.

**At onboarding**
- Claude Haiku picks the 12 templates that best fit the business's services from its industry library (a mix of intents), and fills in the city.
- Industry not in the library yet: Claude writes 12 questions directly (same rules), and the industry is flagged in admin as a candidate for a new library.
- The user can remove, pause or add their own custom questions (max 25 total). Custom questions work normally but are not shared.

**Rules for all questions**: plain natural grammar, no brand names, city always included. Fallback to the old template engine (`src/lib/geo/prompt-engine.ts`) only if Claude fails.

Every active question is scanned.

### 5.4 Answer cache (D-24)

- Key: hash of `model + normalized question text + city/state`.
- Lifetime: 24 hours.
- Shared across all businesses and agencies (the answer to "best dentist in Orange, CA" is the same for everyone). Library questions (5.3) are worded identically for every business in the same industry and city, so they hit the cache; custom questions rarely do.
- All due scans start in the same 02:00 run (6.2), so businesses sharing questions are scanned within the same 24 hours.
- Margins in section 15 assume no cache savings; the cache is a bonus.
- Mentions are detected per business on the cached answer, so each business gets its own result.
- The user is charged 1 credit either way; `usage_events` records our cost as 0 for cache hits.

### 5.5 Mention detection

Replace today's substring match (`src/lib/geo/providers/types.ts:33`):
- Word-boundary match on the business name, ignoring case and suffixes like LLC, Inc, Co.
- Also match the domain and known aliases (`businesses.aliases`).
- For short or generic names (one word, or common words like "Best", "Prime"), require a second signal: city, domain, or phone near the name.
- Record position in lists (1st, 2nd…) when the answer is a list.
- Same rules for competitors.
- Unit tests with tricky names are required.

### 5.6 Scores (D-63 to D-66)

Based on research into how AEO tools and independent studies measure AI visibility (2026-09-26): AI answers change between runs, list order is not reliable, but whether a business appears is fairly stable when measured across many varied questions over time.

**Score**
- **Visibility score** (0 to 100) = mentions ÷ checks, over the **last 30 days** of checks. No bonus or penalty for position in a list.
- Per model scores, plus one overall score = equal-weight average of the chosen models (D-65). Per model scores are always shown next to it.
- **Trend**: a "last 7 days" line and a note such as "Up since your last scan", so real improvements show quickly while the headline stays steady.
- Position in lists is still stored (5.5) for later research, never shown as a rank.

**Confidence (D-64)**
- Margin of error is computed per question cluster (questions differ in difficulty), from **unique answers**: a cached answer reused for several businesses counts once for confidence, even though each business is charged.
- Labels: **Early estimate** (under 50 unique answers), **Good confidence** (50 to 200), **High confidence** (over 200). Trial accounts will usually show "First results. Accuracy improves with every scan."
- Rough guide at 12 questions × 3 models: weekly about ±8 points, daily about ±3, monthly about ±16.

**What the user sees (easy by default)**
- One number, one label, one sentence: "62, Good confidence. AI recommended you in about 6 of 10 customer questions this month."
- Up or down arrow only when the change is larger than the margin.
- Competitors: "ahead" or "behind" only when the gap is larger than the margin; otherwise "about the same".
- Per question: "Appeared in 3 of the last 4 checks", not a percentage.
- Details (margin, number of checks, per model, method) only behind "How is this calculated?".
- Weekly email and alerts only report changes larger than the margin.

**Remove from the UI**: "Share of Voice", "Market Rank", "Direct Score" name, any "ranking position in AI".

**Accuracy gates before launch (D-66)**
- **Mention detection test set**: about 200 real AI answers with correct mentions marked by hand; detection must be at least 95% correct, and the test runs in CI on every change to 5.5.
- **Calibration check (internal, not a user feature)**: the team asks 20 real questions in 2 to 3 cities in the ChatGPT, Claude and Perplexity apps, records which businesses are named, and compares with our API results. About 1 to 2 hours, done by hand (automating the consumer apps would break their terms). Repeat every few months or after a major AI model change. Fix large gaps (usually location). The agreement rate goes into the "How we measure" note.

**Later**: optional "Deep check" add-on that runs each question 10 times once for a precise baseline (about 360 credits).
---

## 6. Background jobs

### 6.1 Pieces (D-42)

- **Supabase pg_cron**: schedules.
- **Supabase pg_net**: lets the database call our worker URL.
- **Worker route** `POST /api/jobs/worker` (on Netlify: a background function) runs scans. Protected by a secret header (`x-worker-secret`).
- **Table `scan_jobs`** (13).

### 6.2 Schedules

| Schedule | What it does |
|---|---|
| Daily at 02:00 UTC | SQL inserts a `queued` job for every business whose `next_scan_at <= now()`, whose agency balance is above 0 and whose agency is not `past_due`, `canceled` or `suspended`. Businesses without credits are skipped and flagged for the low-credit email. |
| Every minute | pg_net calls the worker endpoint. |
| Every 10 minutes | SQL resets jobs stuck in `running` for over 10 minutes back to `queued`. |

### 6.3 Worker

1. Claim up to 10 jobs in one statement:
   ```sql
   update scan_jobs set status = 'running', locked_at = now(), attempts = attempts + 1
   where id in (
     select id from scan_jobs
     where status = 'queued' and run_after <= now()
     order by priority desc, created_at
     limit 10
     for update skip locked
   )
   returning *;
   ```
2. Run the scans in parallel (5.2).
3. Success: `status = 'done'`, set `businesses.next_scan_at` from the frequency, generate opportunities (7).
4. Failure: if `attempts < 3`, `status = 'queued'`, `run_after = now() + 5 minutes × attempts`; else `status = 'failed'` (shown in admin with Retry).
5. Stay under the function time limit: stop claiming new work when the configured time budget is nearly used (600 seconds on a Netlify background function, 240 on Vercel).

### 6.4 Manual scan

- "Run scan" inserts a job with high priority and calls the worker immediately (no wait for the next minute).
- Dashboard polls the job and shows "Scanning…" until `done` or `failed`.
- No daily cap beyond credits, but only one queued or running job per business at a time.

---

## 7. Why competitors win and fix steps

### 7.1 Signals collected

| Signal | Source | Refresh |
|---|---|---|
| Google rating, review count, categories, website, hours | Google Places (business and each competitor), fetched live when a page or report is shown; only `place_id` is stored (D-73) | Live |
| Who AI named instead of the business | Scan answers, including businesses not on the competitor list | Every scan |
| Sources AI cited | Citations from Perplexity and web-search answers | Every scan |
| Website facts (services pages, contact info, structured data) | Firecrawl (business only, not competitors, to save cost) | At onboarding and monthly |

Google attribution is shown wherever Places data appears (section 26).

### 7.2 Explanation

After each scan, Claude Sonnet 5 gets the signals above for the business and its top competitors and returns (structured output):
- 3 to 5 plain-language reasons competitors show up more ("Bean House has 320 Google reviews at 4.7; you have 12 at 4.2").
- Each reason becomes an opportunity with: title, evidence, why it matters, steps, impact (high / medium / low), and a "Copy for Claude" prompt when the fix is on the website.
- Only use provided facts. No guessing about competitors' websites.
- Google Places numbers are never written into stored text. Claude writes placeholders (for example `{competitor.review_count}`) and the live Places values are filled in when the page is shown (D-73).

The fixed rules in `src/lib/geo/opportunity-engine.ts` stay as a fallback.

### 7.3 "Get found by AI" checklist (businesses with no website, and any business missing basics)

1. Create or claim a Google Business Profile
2. Add Yelp, Bing Places and Apple Business Connect listings
3. Get the first 10 reviews (message template included)
4. Keep name, address and phone identical everywhere
5. Build a simple one-page website ("Copy for Claude" prompt)
6. List in local and industry directories

Items can be ticked by the user. Automatic verification comes later.

---

## 8. Customer dashboard

### 8.1 Menu (D-31)

| Item | Contents |
|---|---|
| **Overview** | Visibility score and trend, per-model scores, top 3 opportunities, last scan time, Run scan button, Export PDF and Share buttons |
| **Competitors** | Leaderboard (score vs competitors), manage list (add / remove), side-by-side signals (7.1), "Also recommended by AI" list |
| **Opportunities** | All fix steps, status (open / done / dismissed), Copy for Claude |
| **Questions** | Question list, per-question results per model, add / edit / pause |
| **Sources** | Sites AI cited, how often, whether the business's own site was cited |
| **Settings** | Business profile, AI models, scan frequency, agency name and logo, Billing, Usage |

Sidebar also has: business switcher, usage widget (8.2), "Suggest a feature", sign out.

### 8.2 Usage widget and page (D-33)

- **Widget** (always visible): "620 of 1,200 credits used", progress bar, "Renews in 12 days". During trial: "Trial: 5 days left, 64 of 100 credits left".
- **Usage page**: balance (plan and top-up), used this month, by business, by model, forecast to renewal from the scan schedules, scan history with credits per scan, Buy credits button.

### 8.3 Export and Share (D-12)

- **Export PDF**: score, trend, competitor table, top opportunities, date range. Agency logo and name in the header.
  - Made by printing the share page (`/r/<token>`) to PDF through **Browserless** (hosted Chrome), behind one function `renderPdf(url)` in `modules/reports` (D-71). Browserless waits for a `data-report-ready` element so charts are drawn first.
  - Fallbacks: our own headless Chrome (`playwright-core` + `@sparticuz/chromium`) behind the same function; and print styling on the share page so "Print, Save as PDF" in any browser works.
  - Weekly report emails link to the share page instead of attaching a PDF.
- **Share link**: read-only page at `/r/<random token>`, no login, same content as the PDF. Agency can revoke it. Tokens are long and random; pages are `noindex`.

### 8.4 Wording (D-32)

| Do not show | Show instead |
|---|---|
| Direct Score | Visibility score |
| Share of Voice | How often AI picks you vs competitors |
| buyer-intent prompts | Questions customers ask AI |
| Entity Consistency / Structured Data | Consistent business info / Website info for AI |
| Forum / UGC | Reviews and forums |
| google_places (badge) | Found automatically |
| Beta (Free) | Free trial |
| Authenticated via Supabase Auth | Signed in with email or Google |
| GEO, AEO, WebMCP, LLM, citation rate | Plain descriptions of what they mean |

Also remove: the non-working "Find anything…" button, disabled "coming soon" buttons, "NEW" badges, the white-label teaser.

---

## 9. Admin panel

### 9.1 Menu (D-35)

| Item | Contents | Actions |
|---|---|---|
| **Overview** | Agencies, active trials, paying businesses, revenue this month, credits used, AI cost vs revenue, recent signups, recent failed scans | |
| **Agencies** | One row per agency: owner email, plan mix, credit balance (plan / top-up), trial end, Stripe status, businesses | Add or remove credits (with reason), extend trial, suspend / unsuspend |
| **Businesses** | List and detail: competitors, questions, models, frequency, scan history, opportunities, credits used | Trigger scan |
| **Scans** | Every job: status, business, models, credits, real cost, duration, error | Retry failed |
| **Usage & Cost** | Credits used and real AI cost by day, by model, by agency | |
| **Settings** | Status of keys and services: OpenAI, Anthropic, Perplexity, Google Places, Firecrawl, Stripe, email | |

Also:
- Every admin action is written to `admin_audit_log` (who, what, when, reason).
- Admin access: `requireAdmin()` (`src/lib/admin/require.ts`) only. The old PIN admin is removed.
- Kept but not in the menu: Leads (contact form) and Feature Requests.
- LinkedIn Studio (`/internal/admin/news`) stays untouched until Jordan answers (D-07).
- Later: view as customer, per-model margin reports.

---

## 10. Emails

Provider: Resend (key already in `.env.local`); templates written with React Email in `modules/email/templates` (D-72). All emails have plain text versions and an unsubscribe link where the law requires it (weekly report).

| Email | Trigger |
|---|---|
| Welcome | Account created |
| Trial ending | Stripe `customer.subscription.trial_will_end` (3 days before) |
| Payment failed | Stripe `invoice.payment_failed` |
| Low credits | Pool reaches 80% used, and again at 0 |
| Weekly report | Every Monday, per agency: score changes per business, new opportunities |

---

## 11. Payments (Stripe)

### 11.1 Account setup

- Jordan's Stripe account (Ask Jordan, D-40). Separate Stripe sandbox for development.
- Restricted API key, not the full secret key.
- Current Stripe API version and Node SDK.

### 11.2 Checkout (D-38)

- Our own checkout page using **Checkout Sessions with the Payment Element**. Card fields are Stripe's secure frames inside our page.
- Do not pass `payment_method_types`; let Stripe choose payment methods.
- Signup: subscription with a 7-day trial for the chosen plan, one subscription item per business.
- Adding a business later: add a subscription item (prorated).
- Top-ups: one-time payment Checkout Session.
- Tax: only turn on `automatic_tax` after confirming Jordan has a tax registration in Stripe.

### 11.3 Webhooks (required)

| Event | Action |
|---|---|
| `checkout.session.completed` | Link Stripe customer and subscription to the agency; for top-ups, grant top-up credits |
| `invoice.paid` | Grant plan credits for each business on the invoice; reset plan credits for the new period |
| `invoice.payment_failed` | Mark agency `past_due`, stop scheduled scans, send email |
| `customer.subscription.trial_will_end` | Send trial-ending email |
| `customer.subscription.updated` / `deleted` | Update plan and status per business; on cancel, stop scans at period end |

Keep the existing signature check and idempotency table (`stripe_webhook_events`). Grant credits only from webhooks, never from the success page. Each grant uses the Stripe invoice line ID as `source_id`, so a replayed event cannot grant twice.

### 11.4 Structure and currency (D-56)

- One Stripe subscription per agency, one subscription item per business, one renewal date for the agency.
- The 7-day trial applies to the whole subscription.
- USD only. Turn off Stripe's automatic currency conversion (the test checkout showed PKR).

### 11.5 Plan changes and refunds (D-57)

| Change | When | Money | Credits |
|---|---|---|---|
| Upgrade (Starter to Pro) | Now | Prorated difference charged now (`proration_behavior: always_invoice`) | Prorated extra credits granted when that invoice is paid (e.g. 15 of 30 days left: +650) |
| Downgrade | End of billing period (subscription schedule) | No refund | Current grants stay until they expire |
| Add a business | Now | Prorated charge now | Prorated credits when the invoice is paid |
| Remove a business | End of billing period | No refund | Already granted credits stay until they expire |
| Cancel | End of billing period | No refund | Plan credits usable until period end; top-ups kept but only usable with an active plan |
| Payment fails | Stripe Smart Retries over about 2 weeks | Status `past_due` | Scheduled scans pause immediately; dashboard stays readable; email and banner |
| Final payment failure | Stripe cancels | Status `canceled` | Same as cancel |
| Refund request | Admin decides | Plans: no refunds. Unused top-ups: refundable within 14 days | Refunded top-up grant set to 0 (`source: refund` transaction) |

---

## 12. Marketing site

### 12.1 Pages kept

Homepage (redesigned), `/pricing`, `/agency`, `/compare`, `/contact`, `/privacy`, `/terms`, `/login`, `/signup`, password pages.

### 12.2 Homepage (D-34)

Sections, in order:
1. Hero: one clear line ("See if ChatGPT, Claude and Perplexity recommend your business") and the free compare box
2. How it works: 4 steps (measure, compare, fix, track)
3. Product: 3 short tabs (Visibility, Competitors, Fix steps), clearly marked "Example"
4. For agencies: one block linking to `/agency`
5. Pricing summary from the real plan config
6. FAQ
7. Final call to action

Remove: Gemini and Google AI claims, fake testimonials and stock photos, the AI-made "team photo", repeated video and banner sections, the agent-readiness section, dead components and the old pricing table, "No credit card required".

**How to rebuild it (D-52)**: fresh page, styled only with [design/DESIGN.md](./design/DESIGN.md) tokens and shadcn/ui.

| Carry over from `src/components/site/HomepagePlatform.tsx` | Drop |
|---|---|
| Section order and story | `HeroVideoSection`, `BannerRotationSection`, `ShopperImageSection` |
| `HeroCompareBar` logic (restyled) | `AgentReadySection`, `AgentReadinessDemoCard` |
| Product tab demos (Visibility, Competitors, Sources, Opportunities), marked "Example" | `TestimonialsSection` (fake) |
| `MiniChart`, `smoothPath` | Dead code: `AIVisibilitySection`, `KeySourcesSection`, `CompetitorSection`, `OpportunitiesSection`, `DirectAgentSection`, `PLANS`, `PricingSection` |
| FAQ and How it works text (claims fixed) | All raw hex colours and `rounded-full` / `rounded-2xl` styling |
| `AgencySection` pitch | The blue gradient pill header in `SiteHeader.tsx` |

Steps: (1) set up shadcn/ui with the DESIGN.md theme, (2) new header, footer and section primitives, (3) one file per section under `src/components/site/home/` (about 100 to 200 lines each), (4) delete `HomepagePlatform.tsx` when the new page is complete, (5) Playwright screenshots at 1440px and 390px, then the checks in section 16.

### 12.3 Other fixes

- Remove mentions of cut products from `layout.tsx` metadata, sitemap, header, footer, contact page and chat widget.
- `/compare` tool: stop claiming it shows "who AI recommends" unless it actually runs an AI check. Either rename it ("AI readiness check") or make it run one cheap Perplexity check.
- Pricing page reads from the single plan config.

---

## 13. Data model

New or changed tables. Keep existing ones (`businesses`, `business_competitors`, `tracked_prompts`, `visibility_runs`, `visibility_results`, `visibility_scores`, `opportunities`, `usage_events`, `stripe_webhook_events`, `profiles`) unless noted. All migrations add, never drop, until the MVP is live (D-43).

```
agencies
  id, owner_user_id, name, logo_url, stripe_customer_id, stripe_subscription_id,
  status (trialing | active | past_due | canceled | suspended | deleted),
  trial_ends_at, current_period_end, is_test (true = worker skips real scans),
  created_at

plans                      -- prices and limits live here, not in code (D-58)
  id (starter | pro | enterprise), name, price_cents, monthly_credits,
  max_competitors, max_questions, stripe_price_id, active

credit_grants
  id, agency_id, source (plan | topup | trial | promo | admin | refund),
  source_id (unique with source), business_id?, amount, remaining,
  expires_at?, created_at

credit_transactions        -- append-only ledger, source of truth
  id, agency_id, grant_id?, hold_id?, delta (+/-),
  kind (grant | capture | release | expire | admin_adjust | overdraft_settle),
  source_type, source_id (unique pair), admin_user_id?, note, created_at

credit_holds
  id, agency_id, scan_job_id (unique), amount, captured, released,
  status (open | closed), created_at, closed_at

business_subscriptions
  business_id, agency_id, plan_id, stripe_subscription_item_id, status,
  current_period_end

businesses (add columns)
  agency_id, scan_frequency (daily | weekly | monthly), models text[],
  next_scan_at, onboarding_step, has_website bool, phone, services text[],
  aliases text[], places_id

scan_jobs
  id, business_id, agency_id, status (queued | running | done | failed),
  priority, attempts, run_after, locked_at, hold_id, credits_charged,
  error, created_at, finished_at

question_library
  id, industry, template (with {city}), tags text[], intent, version,
  active, created_at

ai_answer_cache
  cache_key (unique), model, question, location, answer, citations jsonb,
  created_at   -- valid 24 hours

business_site_facts            -- Firecrawl facts about the business's own site only
  business_id, data jsonb, fetched_at

competitors (existing business_competitors, add)
  places_id   -- the only Google Places value we store (D-73)

report_shares
  id, business_id, token (unique), created_at, revoked_at

system_alerts
  id, kind, severity, message, details jsonb, created_at, emailed_at, resolved_at

admin_audit_log
  id, admin_user_id, action, target_type, target_id, details jsonb, created_at
```

Notes:
- `credit_transactions` is the source of truth. `credit_grants.remaining` and holds are updated in the same transaction, only by the SQL functions `hold_credits`, `capture_credit`, `release_hold`, `grant_credits`, `expire_grants`, `admin_adjust_credits` (D-55).
- `expire_grants` runs daily from pg_cron.
- Row level security: agencies can read their own rows; grants, transactions, holds, jobs, cache and audit log are written by the service role only.
- The legacy `subscriptions` table and `billing_accounts` / `business_billing_items` are replaced by `agencies` and `business_subscriptions`. Migrate existing rows, then stop writing to the old tables.

---

## 14. Infrastructure

| Piece | Choice |
|---|---|
| Hosting | Netlify, tested first; Vercel only if the test fails (D-41). Either way `netlify/functions/geo-scheduled-monitoring.mts` is removed (pg_cron schedules scans). On Netlify the worker runs as a background function (15-minute limit) or keeps each run under 60 seconds. |
| Database, auth, storage | Supabase (one project for now, D-43) |
| Scheduling | Supabase pg_cron + pg_net (D-42) |
| Web scraping | Firecrawl |
| Places data | Google Places API (New), field masks on every call |
| AI | OpenAI, Anthropic, Perplexity |
| Email | Resend |
| Payments | Stripe |
| Monitoring | None in MVP (D-44). Log errors to the console and to `scan_jobs.error`. |

Environment variables (new or changed): `FIRECRAWL_API_KEY`, `BROWSERLESS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `WORKER_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, Stripe restricted key and webhook secret, plan price IDs, top-up price IDs. Remove unused: `DATAFORSEO_*`, `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `CLAUDE_API_KEY`, `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `BETA_FREE_ACCESS`, `TRIAL_ENABLED` (replaced by one `BILLING_ENABLED` flag).

Before any key goes into the hosting environment, all keys must be rotated (malware incident, see MVP_ROADMAP SEC-01).

---

## 15. Cost model

Prices checked 2026-09-25 on vendor pricing pages. Recheck before launch.

**Per check (web search on)**

| Model | Our cost |
|---|---|
| Perplexity Sonar | about $0.007 |
| Claude Haiku 4.5 | about $0.015 |
| ChatGPT (`gpt-4.1-mini`, measured) | about $0.03 |

**Per business, one time at onboarding**: about $0.02 to $0.10 (Firecrawl 4 pages, 2 Places calls, Haiku).

**"Also recommended by AI" extraction**: about $0.0014 per check (Haiku, about 900 input and 100 output tokens), about $0.05 per scan; half that through the Batches API; free on cache hits. Included in the credit price.

**PDFs**: Browserless free plan covers 1,000 PDFs a month (1 unit = up to 30 seconds of browser time); next plan $25 a month for 20,000 units (checked 2026-09-26, browserless.io/pricing).

**Per business per month, Starter $149, daily scans**: AI checks about $17.50, explanations about $1, Places refresh about $0.10, Stripe fee about $4.60. Total about $23, margin about 85%. Worst case (all 1,200 credits on ChatGPT): about $36, margin about 75%.

**Fixed per month**: hosting plan (Netlify or Vercel, about $20), Supabase Pro $25, Firecrawl $0 to $16, email $0 to $20.

**Unpaid trial**: about $3 each.

---

## 16. Build rules

- Git (D-45): `main` equals the live site (Netlify auto-publish on). Each task is built on its own `task/B-xx-name` branch and merged by pull request into `main` or into the long-lived `mvp` branch, as named in the build plan. `mvp` is merged into `main` once at go-live. Never push directly to `main`; never use `--no-verify` (D-82).
- Back up Supabase before each migration. Additive migrations only.
- Every task references its ID (`D-xx`, roadmap `SEC-01` etc.) in the PR title.
- Checks before merging: `npx tsc --noEmit`, `npx eslint src`, `npm run build`, and a manual run of the flow touched.
- Next.js 16: auth gating is in `src/proxy.ts`; read `node_modules/next/dist/docs/` before using Next APIs from memory.
- Supabase clients: user-scoped client for user requests; service role only in webhooks, jobs and admin.
- Credits are only granted by Stripe webhooks or admin actions, and only deducted by the worker.

---

## 17. Removal list

Delete after the backup tag exists. Check each path for remaining imports first.

**Pages and components**
- `/ai-employee`, `/ai-phone`, `src/components/ai/*`
- `/dm-ads`, `/customer-acquisition`
- `/ads`, `src/app/ads/*`
- `/call-bar`, `src/components/call-bar/*`, `public/embed/call-bar.v1.js`
- `/sales`, `/sales/dashboard`, `src/components/sales/*`
- `/home-2`, `/ai-search`, `/how-it-works` redirect if unused
- `/admin/*` (PIN admin) and `src/components/admin/*` (prospecting)
- `src/components/PromoBar.tsx`, `MobileCallBar.tsx`, `Header.tsx`, `MainHeader.tsx`, old homepage section components used only by removed pages, `src/components/site/AIOrbitAnimation.tsx`
- Dead homepage code in `HomepagePlatform.tsx` (old pricing table and superseded sections)
- Dashboard: `/dashboard/direct-agent`, `/dashboard/agent-readiness`, `/dashboard/seo`, `/dashboard/visibility` and `/dashboard/reports` (merged into Overview), unused components `PromptPerformanceTable`, `ModelVisibilityGrid`, `VisibilityMultiSeriesChart`, `YourCitedPages`, `AgentCTA`
  - B-03 removes Direct Agent, Agent Readiness and the unused components. `/dashboard/visibility` and `/dashboard/reports` stay live until the new Overview exists and B-58 redirects them. `/dashboard/seo` and `src/lib/seo/*` wait for D-06 to be decided.

**API routes and libraries**
- `src/app/api/admin/*` and `src/lib/admin-session.ts` (move `feature-requests/[id]` to `/api/internal/admin/` first)
- `src/app/api/internal/admin/apply-migration`
- `src/app/api/geo/direct-agent`, `geo/agent-readiness*`, `geo/seo`, `geo/service-requests`
- `src/lib/agent-readiness/*`, `src/lib/seo/*`
- `src/lib/plans.ts`, deprecated aliases in `src/config/pricing.ts` and `src/lib/trial.ts`
- `chatgpt_ads` and `call_bar` values in the contact form, chat widget and leads admin

**Keep until Jordan answers**: `/internal/admin/news` (LinkedIn Studio) and its APIs.

---

## 18. Code structure

Based on the Next.js 16 docs shipped in this repo (`node_modules/next/dist/docs/01-app/`) and current Supabase and Stripe guidance, checked 2026-09-26 (D-59, D-79, D-80).

```
src/
  app/                        routes only: layout, page, route, loading, error
    (marketing)/              public pages
    (app)/dashboard/...       logged-in app
    (admin)/admin/...         admin
    r/[token]/                share page (also printed to PDF)
    api/                      only: Stripe webhooks, job worker, public endpoints
  modules/<feature>/          credits, billing, entitlements, scanning, jobs, onboarding,
                              insights, reports, email, admin
    dal.ts                    server-only: checks login and permissions, reads the
                              database, returns only the fields the screen needs
    actions.ts                "use server" mutations; thin, call dal/service
    service.ts                pure business logic, no framework or database imports
    schema.ts                 zod input and output shapes
    prompts/                  AI prompts as versioned files (also used by evals)
    *.test.ts                 Vitest tests next to the code
  components/
    ui/                       shadcn/ui, themed by design/DESIGN.md
    app/                      app pieces: ScoreRing, UsageWidget, Leaderboard...
    marketing/                header, footer, homepage sections
  lib/                        supabase clients, env.ts (validated), logger
  types/database.types.ts     generated from Supabase, never hand-edited
  proxy.ts                    quick login redirect only
supabase/migrations/          tables, RLS policies, SQL functions
tests/e2e/                    Playwright end-to-end tests
evals/                        AI evals (section 25)
```

### 18.1 Rules

| # | Rule | Why | Enforced by |
|---|---|---|---|
| 1 | Each feature has a Data Access Layer (`dal.ts`, `server-only`). Only the DAL reads the database or secrets. | Next.js 16 recommends a DAL for new projects; "only the Data Access Layer should access `process.env`" (`02-guides/data-security.md:58, 132`) | `server-only` import (build fails if pulled into browser code); `eslint-plugin-boundaries` |
| 2 | Every Server Action and route handler checks login and permissions itself. | Server Actions are "reachable via a direct POST request" (`data-security.md:281, 291`) | CI check that each `actions.ts` and `route.ts` calls `requireUser()` / `requireAdmin()` |
| 3 | Server Actions for UI mutations; route handlers only for webhooks, the job worker and public endpoints. | Next.js 16 guidance (`01-getting-started/07-mutating-data.md`, `15-route-handlers.md`) | Code review |
| 4 | `proxy.ts` does quick cookie-based redirects only, no database or permission logic. | "not intended for slow data fetching… should not be used as a full session management or authorization solution" (`16-proxy.md:29`) | Boundaries rule: no module imports in `proxy.ts` |
| 5 | Return only the fields the screen needs, never whole database rows. | Return values are sent to the browser (`data-security.md`) | Review; lint ban on `select("*")` outside `dal.ts` |
| 6 | Environment variables only through `lib/env.ts`, validated with zod at startup. | Fails fast on missing keys; keeps secrets out of the browser bundle | Lint ban on `process.env` outside `lib/env.ts` |
| 7 | Database types generated from Supabase after every migration. | Types never drift from the schema | CI regenerates and fails on a diff |
| 8 | Use `supabase.auth.getUser()` or `getClaims()` for trust decisions, never `getSession()`. | `getSession()` reads an unverified cookie (Supabase SSR docs) | Lint ban on `getSession()` in server code |
| 9 | RLS on every table; DAL checks on top. | Defence in depth | CI check: every new table migration enables RLS |
| 10 | Stripe webhooks read the raw body, verify the signature, return quickly, and every handler is safe to run twice. | Stripe requirement; retries happen | Webhook tests with fixture payloads (section 21) |
| 11 | Features do not import each other's internals; components never import Supabase, Stripe or AI clients. | Keeps changes local and code replaceable | `eslint-plugin-boundaries` in CI |
| 12 | Files stay small: warn at 250 lines, error at 400 in `src/app` and `src/modules`. | Today's files reach 2,616 lines | ESLint `max-lines` |
| 13 | Vitest for logic; Playwright for async Server Components, login and checkout. | Vitest cannot render async Server Components (`02-guides/testing/index.md`) | CI runs both |
| 14 | Next.js 16 Cache Components on from the start (`cacheComponents: true`), with `"use cache"` and `<Suspense>` used deliberately. | It is off today; switching later changes caching everywhere (`01-getting-started/08-caching.md`) | `next.config.ts` |

### 18.2 Tooling to add at the start

`zod`, `@t3-oss/env-nextjs` (or a zod-only `env.ts`), `server-only`, `eslint-plugin-boundaries`, `vitest`, `@playwright/test`, `vitest-evals`, `autoevals`, generated Supabase types. Remove `iron-session` (only used by the old PIN admin) and `@netlify/plugin-nextjs` only if we move to Vercel (D-41).

### 18.3 Existing code

Old code moves into this layout when it is touched. Files over 400 lines are split when first changed (largest today: `HomepagePlatform.tsx` 2,616, `NewsClient.tsx` 961, `BillingPageClient.tsx` 736, `CompareClient.tsx` 744, `ProcessSection.tsx` 723, `pricing/page.tsx` 597, `api/stripe/webhook/route.ts` 444).

---

## 19. Moving existing data

D-69 (Proposed). Counted read-only on 2026-09-26: 9 profiles, 5 businesses, 20 competitors, 94 tracked prompts, 4 visibility runs, 48 visibility results, 9 `billing_accounts`, 5 `business_billing_items`, 0 `subscriptions`, 4 `usage_events`, 3 contact submissions. This includes the audit test account (`ek181773+cdaudit0923@gmail.com`) and its Brandastic business, which are kept and marked `is_test` (used for testing).

The data is small, but the move is still scripted and repeatable so it can be tested on a copy first.

**Steps**
0. **Backup**: Supabase backup (or `pg_dump`) and a note of every table's row count.
1. **Add, don't change**: one migration creates the new tables and columns (13), the SQL functions (4.2, 6.3) and RLS policies. Nothing existing is altered or dropped.
2. **Backfill** (one idempotent SQL migration, safe to run twice):
   - Every profile that owns a business or a billing account gets an `agencies` row (name from the profile, else the email domain).
   - `businesses.agency_id` set; `scan_frequency = weekly`; `models` = all three; `has_website` = domain present; `next_scan_at = now()`.
   - Existing tracked prompts become custom questions (`source = legacy`), not library questions.
   - Existing visibility results are kept and mapped to checks, so the 30-day score includes history.
   - Stripe data is **not** carried over: current rows point to the "WorkNex sandbox" test account. Existing users start fresh on Jordan's Stripe.
   - Existing beta users: treatment is an open question (Ask Jordan). Proposed: a fresh 7-day trial with 100 credits at launch, and an email explaining the change.
3. **Verify**: row counts match, every business has an agency, and a normal user token can read only its own rows.
4. **Switch** the app to the new tables. Old tables stay untouched and unused for 30 days after launch, then a later migration drops them.

**Rollback**: because steps 1 and 2 only add, rolling back means redeploying the previous app version. No data is lost.

---

## 20. Going live (Netlify or Vercel)

D-41, D-70 (Proposed). The rebuilt app is tested on a Netlify preview first (build plan B-08 and B-28). If it works, it goes live on Netlify: rotated environment variables in Netlify, the worker as a background function, Stripe webhooks and the pg_net worker URL pointed at the production domain, then `mvp` merged into `main`. The steps below apply only if the Netlify test fails and we move to Vercel. The live site stays on Netlify until the new one is tested.

**Before starting**
- All API keys replaced (malware incident, roadmap SEC-01).
- Jordan's Stripe account ready, with a sandbox for testing.
- Access to the domain's DNS settings (Ask Jordan: who controls the domain).
- Netlify auto-deploy paused (D-45), so half-built MVP work on `main` never goes live.

**Steps**
1. Create the Vercel project from the GitHub repo. Add environment variables for Preview and Production (new keys only). Node 24 (Netlify currently pins Node 20, which is being retired).
2. Remove `netlify.toml`, `@netlify/plugin-nextjs` and `netlify/functions` (the daily job moves to pg_cron, 6.2).
3. Test the full flow on a Vercel preview URL: signup with a test agency (`is_test`), Stripe sandbox checkout, webhooks pointed at the preview URL, the pg_net worker pointed at the preview URL with its secret.
4. Go live:
   - Lower the domain's DNS TTL a day before.
   - Add the domain in Vercel and switch DNS.
   - Point the Stripe webhook, Supabase Auth site URL and redirect URLs, Google OAuth redirect URIs, and the pg_net worker URL at the production domain.
   - Run one real signup and scan with an internal account.
5. Keep the Netlify site available (not deleted) for 7 days; rollback = switch DNS back.
6. After 7 days without issues, delete the Netlify site.

---

## 21. Testing and definition of done

D-75.

**Tests**
- **Unit (Vitest, next to the code)**: credits (hold, capture, release, overdraft, two scans at once) against a local Supabase; mention detection; scoring and confidence; entitlements; question picking rules.
- **Integration**: Stripe webhooks replayed with the Stripe CLI and fixture payloads; the worker claiming jobs without two workers taking the same one.
- **End-to-end (Playwright)**: signup, onboarding, Stripe sandbox checkout, first scan, using an `is_test` agency and recorded AI answers.
- **CI (GitHub Actions) on every pull request**: typecheck, lint (including boundaries and max-lines), unit and integration tests, build, end-to-end, fast evals (section 25).

**Definition of done** for every task:
- Acceptance criteria in the task are met.
- Tests added or updated; all CI checks pass.
- For UI: screenshots at 1440px and 390px, empty, loading and error states done, DESIGN.md followed, no raw hex colours.
- No new `process.env` outside `lib/env.ts`; every action and route checks auth.
- Docs updated (decision ID referenced) where behaviour changed.
- Reviewed and merged through a pull request.

---

## 22. Alerts

D-76. No Sentry in the MVP (D-44).

A pg_cron job every 15 minutes checks, and emails the admin (at most once per hour per alert type):
- More than 20% of scans failed in the last hour.
- Jobs stuck in `running` (after the reset in 6.2 fails to clear them).
- Failed Stripe webhook events.
- Error spike from one AI provider, Firecrawl, Places or Browserless.
- Agencies with a negative credit balance.
- Daily real AI cost above a set limit.

Alerts are stored in `system_alerts` and shown on the admin Overview. The hosting provider's function logs cover everything else.

---

## 23. Account and business deletion

D-77.

**Delete account** (Settings, confirm by typing the agency name):
1. Stripe subscription cancelled immediately, no refund.
2. Agency set to `deleted` (soft delete): login blocked, scans stopped, share links revoked.
3. After 30 days a pg_cron job permanently deletes businesses, questions, results, logos and the Supabase auth user. The account can be restored by an admin within those 30 days.
4. Invoices stay in Stripe for accounting. `credit_transactions` rows are anonymised (agency link removed), not deleted.
5. Confirmation email at each step.

**Delete a business**: same pattern for one business; its subscription item is removed at period end (11.5).

Legal deadlines (for example about 1 month under GDPR, 45 days under CCPA) need confirming by a lawyer for the markets we sell in.

---

## 24. Terms and privacy updates

D-78. **Draft list only; Jordan or a lawyer must review before launch.**

The Terms and Privacy pages must cover:
- 7-day trial with card, automatic charge on day 7, automatic monthly renewal, and how to cancel online. Some US states (for example California) have automatic renewal laws; a lawyer confirms the exact wording.
- Credits: what a credit is, plan credits expire at period end, top-ups need an active plan, credits have no cash value.
- Refunds and cancellation (11.5).
- AI and data: questions are sent to OpenAI, Anthropic and Perplexity; website pages to Firecrawl; Google Places data is used and attributed; PDFs are made through Browserless.
- List of subprocessors (Supabase, Netlify or Vercel, Stripe, Resend, OpenAI, Anthropic, Perplexity, Firecrawl, Google, Browserless).
- Data retention and deletion (section 23).
- Share links are visible to anyone who has the link.
- Agencies are responsible for having their clients' permission.
- Results are estimates; no guarantee of AI rankings.

---

## 25. AI evals

D-81. Evals test the AI parts' quality when a prompt or model changes. Based on Anthropic's eval guides, OpenAI's evaluation best practices and practitioner guidance (Hamel Husain, Shreya Shankar, Eugene Yan), checked 2026-09-26.

**Tool**: `vitest-evals` (Sentry, runs inside Vitest; npm 0.17, updated 2026-09-10), with scorer functions from `autoevals` where useful. Fallback: `promptfoo`. Not used: hosted platforms (LangSmith, Braintrust platform) because of per-use pricing and lock-in.

**Folder**
```
evals/
  mention-detection/        dataset.v1.jsonl, grader.ts, *.eval.ts, README.md
  entity-extraction/
  business-autofill/
  question-picking/
  why-competitors-win/
  prompt-templates/
  shared/judge.ts           one AI-grader client, pinned model
  results/                  gitignored except one baseline per suite
.github/workflows/eval-fast.yml   every pull request
.github/workflows/eval-ai.yml     only when a prompt or model changes
```
- Evals import the real prompts from `src/modules/*/prompts/`.
- Datasets are versioned (`dataset.v1`, `v2`) with a changelog per suite.
- No private customer data in the repo; production answers are referenced by ID and loaded at run time.

**Principles**
1. Read 20 to 50 real outputs by hand before writing graders.
2. Code graders before AI graders wherever the output has a fixed shape.
3. AI graders give pass or fail, not 1 to 5 scores.
4. Check each AI grader against about 100 human-labelled examples; at least 90% agreement before trusting it.
5. A model never grades its own output.
6. Correct answers are labelled by people, never copied from the model under test.
7. Pin exact model versions; record the real cost of every run.
8. Pass levels sit above the noise (about ±14 points at 25 cases, ±7 at 100).
9. API errors are counted separately, never as model failures.
10. Every case is saved in full (input, output, grade).
11. A perfect score or a sudden jump gets checked by hand.
12. Every real production failure becomes a new case.

**Suites**

| Suite | Grader | Start size | Pass level | Runs |
|---|---|---|---|---|
| Mention detection | Code | 150 to 200 answers, positive and negative | At least 95% accuracy; false positives reported separately | Every pull request |
| "Also recommended" extraction | Code, set F1 | 50 to 100 answers | F1 at least 0.85 to start | Every pull request |
| Business auto-fill | Code schema check plus "nothing invented" check | 30 to 50 businesses | Schema 100%; any invented field fails | Schema every PR; invented-field check on prompt or model change |
| Question picking | Overlap with an acceptable pool | 20 to 30 businesses | Overlap at least 0.8 to start | Every pull request |
| Why competitors win | AI grader checklist (different model), calibrated first | 20 to 40 cases | Grader at least 90% agreement with people, then a set pass rate | On prompt or model change |
| Copy for Claude prompts | Code (no empty placeholders, length, structure) | 10 to 20 | 100% | Every pull request |

Pass levels other than mention detection are starting points, tightened after the first baseline. Building the datasets and runner takes about 2 to 3 days, mostly hand-labelling.

---

## 26. Google Places rules

D-73. Quoted from the Google Maps Platform Terms (cloud.google.com/maps-platform/terms) and Service Specific Terms (cloud.google.com/maps-platform/terms/maps-service-terms), read 2026-09-26. **Our reading, to be confirmed by a lawyer.**

- May store permanently: `place_id` only ("Customer may cache… place_id from Places API").
- May store for up to 30 days: latitude and longitude (Places API section 14.3).
- Must not: "copy and save business names, addresses, or user reviews" (3.2.3(a)(iii)); cache anything else (3.2.3(b)); "create content based on Google Maps Content" (3.2.3(c)).
- Places data may be used without a Google map (14.1), but not with a non-Google map (14.2). Google attribution must be shown.

**How we comply**
- Store only `place_id` for businesses and competitors. Fetch ratings, review counts, hours and categories live when shown, with attribution.
- Onboarding: Places only pre-fills the form; the saved record is the user's confirmation of their own business.
- Competitor list: names are confirmed by the user; `place_id` kept for live lookups.
- Explanations: Claude writes placeholders; live Places values are filled in at display time, never stored.
- Existing code saves competitor names from Places (`source: google_places`); fix during the move.
