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
| 6 | Questions | 12 written by Claude Haiku (5.3). User edits, removes or adds (max 25). |
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

### 4.2 Credits (D-19, D-22 to D-25)

- 1 check = 1 credit, any model, always with web search.
- Two buckets in the pool:
  - **Plan credits**: granted per business at each renewal; unused plan credits expire at the next renewal.
  - **Top-up credits**: bought separately; never expire.
- Spending order: plan credits first, then top-up credits.
- Top-up packs: 500 credits for $50, 2,000 for $180 (Proposed).
- Cached answers (5.4) still cost 1 credit.
- Before a scan starts, reserve `questions × models` credits. If the pool is short, the scan does not start (manual: show "Not enough credits"; scheduled: skip and email).
- At 0 credits: every scan stops. Dashboard stays readable. Banner: "Out of credits: buy a top-up or upgrade."
- Alerts: email and banner at 80% used and at 0.

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
| Check on ChatGPT | OpenAI cheap model (gpt-4o-mini or current successor) | Responses API web search tool |
| Check on Claude | `claude-haiku-4-5` | Anthropic web search tool (basic variant for Haiku) |
| Check on Perplexity | `sonar` | Always on |
| Auto-fill, question writing | `claude-haiku-4-5` | No |
| "Why competitors win" | `claude-sonnet-5` | No |

Current code: only the first configured provider runs (`src/lib/geo/run-visibility.ts:58`), no web search on OpenAI or Claude, Claude pinned to the old `claude-3-5-haiku-20241022`, no request timeouts. All of that changes.

### 5.2 One check

1. Build the question text with the business city (the API has no user location).
2. Look up the cache (5.4). On a hit, reuse the answer.
3. Otherwise call the model with web search, 30-second timeout, 2 retries with backoff on 429 and 5xx.
4. Save the answer, citations (source URLs), model, latency and our real cost.
5. Detect mentions (5.5) for the business and every competitor.
6. Deduct 1 credit (ledger row) and write a `usage_events` row with the real API cost.

Checks inside a scan run in parallel (limit 4 to 6 per scan).

### 5.3 Question writing (D-28, D-29)

- Claude Haiku writes 12 questions from: industry, services, city, state, and business type.
- Mix: "best X in city", specific services ("oat milk latte in Orange, CA"), urgency ("open now", "same day"), price, reviews.
- Plain, natural grammar. No brand names.
- Fallback to the template engine (`src/lib/geo/prompt-engine.ts`) if the call fails.
- Every active question is scanned. Max 25 per business.

### 5.4 Answer cache (D-24)

- Key: hash of `model + normalized question text + city/state`.
- Lifetime: 24 hours.
- Shared across all businesses and agencies (the answer to "best dentist in Orange, CA" is the same for everyone).
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

### 5.6 Scores

- **Visibility score** (0 to 100): mentions ÷ checks for the latest scan, overall and per model.
- **Rank vs competitors**: order by visibility score. Hide it and show "Not enough data yet" when no competitor has any mention.
- Keep history per scan for the trend chart.
- Remove from the UI: "Share of Voice", "Market Rank" as separate cards, "Direct Score" name (the formula can stay internal but the user sees one score).

---

## 6. Background jobs

### 6.1 Pieces (D-42)

- **Supabase pg_cron**: schedules.
- **Supabase pg_net**: lets the database call our worker URL.
- **Vercel route** `POST /api/jobs/worker`: runs scans. Protected by a secret header (`x-worker-secret`).
- **Table `scan_jobs`** (13).

### 6.2 Schedules

| Schedule | What it does |
|---|---|
| Daily at 02:00 UTC | SQL inserts a `queued` job for every business whose `next_scan_at <= now()` and whose agency has enough credits. Businesses without credits are skipped and flagged for the low-credit email. |
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
5. Stay under the function time limit: stop claiming new work after 240 seconds.

### 6.4 Manual scan

- "Run scan" inserts a job with high priority and calls the worker immediately (no wait for the next minute).
- Dashboard polls the job and shows "Scanning…" until `done` or `failed`.
- No daily cap beyond credits, but only one queued or running job per business at a time.

---

## 7. Why competitors win and fix steps

### 7.1 Signals collected

| Signal | Source | Refresh |
|---|---|---|
| Google rating, review count, categories, website, hours | Google Places (business and each competitor) | Monthly, and at onboarding |
| Who AI named instead of the business | Scan answers, including businesses not on the competitor list | Every scan |
| Sources AI cited | Citations from Perplexity and web-search answers | Every scan |
| Website facts (services pages, contact info, structured data) | Firecrawl (business only, not competitors, to save cost) | At onboarding and monthly |

### 7.2 Explanation

After each scan, Claude Sonnet 5 gets the signals above for the business and its top competitors and returns (structured output):
- 3 to 5 plain-language reasons competitors show up more ("Bean House has 320 Google reviews at 4.7; you have 12 at 4.2").
- Each reason becomes an opportunity with: title, evidence, why it matters, steps, impact (high / medium / low), and a "Copy for Claude" prompt when the fix is on the website.
- Only use provided facts. No guessing about competitors' websites.

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

Provider: Resend (key already in `.env.local`). All emails have plain text versions and an unsubscribe link where the law requires it (weekly report).

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

Keep the existing signature check and idempotency table (`stripe_webhook_events`). Grant credits only from webhooks, never from the success page.

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
  status (trialing | active | past_due | canceled | suspended),
  trial_ends_at, plan_credits_balance, topup_credits_balance, created_at

credit_ledger
  id, agency_id, delta (+/-), bucket (plan | topup | trial),
  reason (plan_grant | topup | trial_grant | scan | admin_adjust | expiry),
  business_id?, scan_job_id?, admin_user_id?, note, created_at

business_subscriptions
  business_id, agency_id, plan_id, stripe_subscription_item_id, status,
  current_period_end

businesses (add columns)
  agency_id, scan_frequency (daily | weekly | monthly), models text[],
  next_scan_at, onboarding_step, has_website bool, phone, services text[],
  aliases text[], places_id

scan_jobs
  id, business_id, agency_id, status (queued | running | done | failed),
  priority, attempts, run_after, locked_at, credits_reserved, credits_charged,
  error, created_at, finished_at

ai_answer_cache
  cache_key (unique), model, question, location, answer, citations jsonb,
  created_at   -- valid 24 hours

competitor_signals
  business_id, competitor_id?, source (places | firecrawl), data jsonb, fetched_at

report_shares
  id, business_id, token (unique), created_at, revoked_at

admin_audit_log
  id, admin_user_id, action, target_type, target_id, details jsonb, created_at
```

Notes:
- Balances on `agencies` are updated in the same transaction as each `credit_ledger` row; the ledger is the source of truth.
- Row level security: agencies see only their own rows; ledger, jobs, cache and audit log are written by the service role only.
- The legacy `subscriptions` table and `billing_accounts` / `business_billing_items` are replaced by `agencies` and `business_subscriptions`. Migrate existing rows, then stop writing to the old tables.

---

## 14. Infrastructure

| Piece | Choice |
|---|---|
| Hosting | Vercel (D-41). Remove `netlify.toml`, the Netlify plugin and `netlify/functions`. |
| Database, auth, storage | Supabase (one project for now, D-43) |
| Scheduling | Supabase pg_cron + pg_net (D-42) |
| Web scraping | Firecrawl |
| Places data | Google Places API (New), field masks on every call |
| AI | OpenAI, Anthropic, Perplexity |
| Email | Resend |
| Payments | Stripe |
| Monitoring | None in MVP (D-44). Log errors to the console and to `scan_jobs.error`. |

Environment variables (new or changed): `FIRECRAWL_API_KEY`, `GOOGLE_PLACES_API_KEY`, `WORKER_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, Stripe restricted key and webhook secret, plan price IDs, top-up price IDs. Remove unused: `DATAFORSEO_*`, `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `CLAUDE_API_KEY`, `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `BETA_FREE_ACCESS`, `TRIAL_ENABLED` (replaced by one `BILLING_ENABLED` flag).

Before any key goes into Vercel, all keys must be rotated (malware incident, see MVP_ROADMAP SEC-01).

---

## 15. Cost model

Prices checked 2026-09-25 on vendor pricing pages. Recheck before launch.

**Per check (web search on)**

| Model | Our cost |
|---|---|
| Perplexity Sonar | about $0.007 |
| Claude Haiku 4.5 | about $0.015 |
| ChatGPT (gpt-4o-mini) | about $0.026 |

**Per business, one time at onboarding**: about $0.02 to $0.10 (Firecrawl 4 pages, 2 Places calls, Haiku).

**Per business per month, Starter $149, daily scans**: AI checks about $17.50, explanations about $1, Places refresh about $0.10, Stripe fee about $4.60. Total about $23, margin about 85%. Worst case (all 1,200 credits on ChatGPT): about $36, margin about 75%.

**Fixed per month**: Vercel Pro $20, Supabase Pro $25, Firecrawl $0 to $16, email $0 to $20.

**Unpaid trial**: about $3 each.

---

## 16. Build rules

- Git: tag `original-backup` before the first change; work on `main` (D-45).
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

**API routes and libraries**
- `src/app/api/admin/*` and `src/lib/admin-session.ts` (move `feature-requests/[id]` to `/api/internal/admin/` first)
- `src/app/api/internal/admin/apply-migration`
- `src/app/api/geo/direct-agent`, `geo/agent-readiness*`, `geo/seo`, `geo/service-requests`
- `src/lib/agent-readiness/*`, `src/lib/seo/*`
- `src/lib/plans.ts`, deprecated aliases in `src/config/pricing.ts` and `src/lib/trial.ts`
- `chatgpt_ads` and `call_bar` values in the contact form, chat widget and leads admin

**Keep until Jordan answers**: `/internal/admin/news` (LinkedIn Studio) and its APIs.
