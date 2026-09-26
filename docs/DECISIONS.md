# Decisions Log

What we chose for the Customers.Direct MVP, why, and what we rejected. Planning sessions ran 2026-09-22 to 2026-09-25.

- What the client asked for: [CLIENT_REQUIREMENTS.md](./CLIENT_REQUIREMENTS.md)
- How to build it: [MVP_SPEC.md](./MVP_SPEC.md)
- Technical fix list: [MVP_ROADMAP.md](./MVP_ROADMAP.md)

## Status values

- **Decided**: confirmed by Ehtisham. Build it.
- **Proposed**: recommended and not objected to, but not explicitly confirmed. Confirm before building.
- **Ask Jordan**: needs the client's answer. See [Ask Jordan](#ask-jordan) at the bottom.

To change a decision, edit its row, add the new date, and keep the old choice in "Rejected" so the history stays visible.

---

## 1. Product and scope

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-01 | The product is one tool: AEO (getting a local business recommended by AI assistants). Loop: measure, compare with competitors, explain why they win, give fix steps, measure again. | Decided | Jordan: "get rid of everything that doesn't help the MVP" (07:48). | Keeping the other products in the same app |
| D-02 | Local businesses first, global later. | Decided | Agreed in the call (07:37). Less competition, fewer AI tokens. | Global queries at launch |
| D-03 | Sold mainly to agencies that manage many client businesses. | Decided | Jordan's plan (07:31). Agencies pay per business. | Single-business owners as the main market |
| D-04 | Cut these separate products: AI Employee / AI Phone, DM Ads, ChatGPT Ads (`/ads`), Call Bar, Sales program, Prospecting, old PIN admin, `/home-2`, DEAL26 promo bar, mobile call bar. | Decided | Not part of the AEO tool. | Keeping them hidden |
| D-05 | Cut from the dashboard: Direct Agent chat, Request Fix, Agent Readiness. | Decided | Not core to the AEO loop. Agent Readiness also gave false 0 scores on Cloudflare sites. | Keeping them as extra menu items |
| D-06 | Drop Search Intelligence (DataForSEO) from the MVP. Use Google Places and AI citations for "why competitors win" instead. On hold (2026-09-26): the existing SEO page stays live as it is, with no work on it, until this is decided. | Proposed | Google SEO data is not AI visibility and costs money per call. Places data is more relevant for local. | Keeping it as a menu item; merging DataForSEO data into Competitors |
| D-07 | Keep LinkedIn Studio (admin news page) untouched until Jordan answers. | Decided | Admin only, no customer impact, no cost when unused. Can be restored from the backup tag if deleted later. | Deleting it now |
| D-08 | Businesses with no website are supported in the MVP, as a light version: "No website" onboarding option, mention matching by name and city, fixed "get found by AI" checklist. Automatic verification and progress tracking come later. | Decided (confirm with Jordan) | Many local businesses have no site. Not raised in the meeting, so Jordan should confirm. | Skipping them until after the MVP |
| D-09 | Keep "Copy for Claude" fix prompts. | Decided | Jordan asked for it (07:54). Already built. | |

## 2. Accounts and access

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-10 | One login per agency in the MVP. | Decided | Simplest. | Team members with roles (later: Owner, Manager, Viewer, invite by email) |
| D-11 | No logins for an agency's clients. Clients get a PDF report or a read-only share link. | Decided | Keeps the MVP small; Export and Share cover it. | Client portal logins |
| D-12 | Export PDF and Share link are built in the MVP, with the agency's logo on the PDF. | Decided | Agencies need to send client reports. | Full white-label (later) |

## 3. Signup, onboarding and trial

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-13 | The user chooses a plan on the pricing page before signing up. | Decided | Plan is known before onboarding. | Choosing a plan inside the dashboard |
| D-14 | Flow: create account, agency name, business (website or "no website"), details auto-filled, competitors, AI-written questions, AI models and scan frequency, card, first scan, dashboard. | Decided | Card comes after the user has invested effort, right before the first paid action. | Card at the very start |
| D-15 | Card required to start the trial. | Decided | Filters out random signups. | No-card trial |
| D-16 | Trial: 7 days, 2 businesses, auto-charged on day 7 unless cancelled. | Decided | Jordan: trial limited to 2 businesses (07:43). | |
| D-17 | Trial credits: 100. | Proposed | 50 covers barely one scan; 100 covers first scans for both businesses plus one rescan. | 50 credits |
| D-18 | Business details are auto-filled from Firecrawl (website pages) plus Google Places, combined by Claude Haiku 4.5 into fixed fields. The user confirms. Manual form if both fail. | Proposed | Same idea as Voxtell's onboarding; Firecrawl gets past Cloudflare; Places is authoritative for address, phone and category. About $0.01 to $0.10 per business. | Our own HTML scanner only (fails on Cloudflare) |

## 4. Pricing and credits

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-19 | 1 credit = 1 question checked on 1 AI model. | Decided | Simple for users to understand. | Tokens or minutes |
| D-20 | Plans are priced per business. Each business's monthly credits go into one shared agency credit pool. | Decided | Jordan: agencies pay for every business they add (07:32). Pool keeps it flexible. | Credits per business; one flat agency plan |
| D-21 | Plans: Starter $149 per business per month (1,200 credits), Pro $249 per business per month (2,500 credits). | Ask Jordan | Jordan said $150 to $250 a month (07:33, 07:39). About 75% margin or more. | Current $149 / $297 / $497 three-tier plans |
| D-22 | Top-ups: 500 credits for $50, 2,000 for $180. Top-up credits never expire; plan credits reset each month. | Proposed | Buyers of top-ups paid separately, so they keep them. | Expiring top-ups |
| D-23 | Every check uses web search and costs 1 credit, whichever model. Credit value about $0.10. | Proposed | One simple rule. ChatGPT with web search costs about $0.026, still about 70% margin. | Different credit prices per model |
| D-24 | Answers are cached for 24 hours. A cached answer still costs the user 1 credit. | Decided | Same freshness and value for the user; the saving covers API overhead and margin. | 7-day cache (too stale for daily scans); free cached answers |
| D-25 | At 0 credits every scan stops (manual and automatic). Past results stay visible. Emails at 80% used and at 0. | Decided | No credits, no work. | |

## 5. Scanning

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-26 | Track ChatGPT, Claude and Perplexity, all on by default. The user can turn models off, with a clear explanation of what they lose. Gemini later. | Decided | Most customers use ChatGPT; tracking only Claude would miss most of the market. | Claude only; Gemini at launch |
| D-27 | Scan frequency is the user's choice: daily, weekly or monthly. Default weekly. Show the monthly credit estimate while choosing. | Decided (default weekly is Proposed) | User control; weekly default cuts AI cost about 75% for new users. | Fixed frequency per plan |
| D-28 | 12 questions per business by default, 25 maximum in the MVP. Every question is scanned (fix today's "25 saved, 12 scanned" bug). | Proposed | Accuracy vs credit use. | Unlimited questions |
| D-29 | Questions are prepared by Claude Haiku 4.5 at onboarding, fitted to business type, services and city. The user reviews and edits. Templates stay as a fallback. Refined by D-62 (industry library). | Decided | Natural, industry-specific questions (Jordan's per-industry prompts request). | Templates only |
| D-30 | Claude Haiku 4.5 (`claude-haiku-4-5`) for auto-fill and question writing. Claude Sonnet 5 (`claude-sonnet-5`) for "why competitors win" explanations. | Decided | Cheap model where quality matters less, stronger model where it matters (07:36). | One model for everything |
| D-62 | Questions come from a reviewed industry question library (about 40 per industry, city filled in). Claude Haiku picks the 12 that fit each business; users can add custom questions. First 10 industries (Proposed): dentist, lawyer, restaurant, coffee shop, plumber, HVAC, med spa, real estate, auto repair, salon. Unknown industries: Claude writes the questions directly. | Decided | Shared wording makes the 24-hour cache work, makes scores comparable across businesses, and keeps question quality reviewed. Still industry-specific (Jordan's request). | Fully tailored questions per business (cache almost useless); half standard, half tailored |
| D-63 | Visibility score = how often the business is mentioned (mentions ÷ checks) over the last 30 days, with a 7-day trend line. No list-position weighting and no "rank in AI". | Decided | Research (2026-09-26): answers vary run to run; SparkToro found under 1 in 1,000 chance of the same order, while appearance is fairly stable. Industry norm (Peec AI and others) is one run per question per model per day, smoothed over time. Variety of questions and models improves reliability more than repeats. | Latest-scan-only score (too noisy); asking each question twice (doubles cost); top-3 position bonus |
| D-64 | Show confidence: a simple label (Early estimate / Good / High confidence) with details behind "How is this calculated?". Margin computed per question cluster from unique answers (cached answers count once). Changes, competitor gaps and alerts only reported when larger than the margin. | Decided | No competitor shows uncertainty (independent review of 35+ tools); easy for users while honest. | Showing a bare number as if exact |
| D-65 | Overall score = equal-weight average of the chosen models; per-model scores always shown. | Decided | Simple and transparent for the MVP. | Weighting by each AI's user share (needs a source and upkeep) |
| D-66 | Accuracy gates before launch: mention detection test set (about 200 answers, at least 95% correct, runs on every change) and an internal calibration check against the real ChatGPT, Claude and Perplexity apps (by hand, 1 to 2 hours, repeated every few months). Users never do this. | Decided | Detection errors and API-vs-app differences affect accuracy more than sample size. | Launching without measuring accuracy; automating the consumer apps (breaks their terms) |
| D-67 | Every check passes the business location (city, region, country) to the AI's web search as `user_location`, and the question text also names the city. | Decided | Answers then match what a customer in that city sees. Supported by all three (OpenAI Responses API, Anthropic web search, Perplexity `web_search_options`). | City only in the question text |
| D-68 | ChatGPT checks use `gpt-4.1-mini` (or its current cheap equivalent) through the OpenAI Responses API. | Decided | Live test 2026-09-26: `gpt-4o-mini` did not search; `gpt-4.1-mini` searched with location for about $0.03; `gpt-5-mini` cost 3 to 4 times more. Location is not supported on the older Chat Completions search models. | `gpt-4o-mini` (today's code); `gpt-5-mini` (cost) |

## 6. Screens

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-31 | Dashboard menu: Overview, Competitors, Opportunities, Prompts (renamed "Questions"), Sources, Settings. Billing and Usage open from Settings and the sidebar usage widget. | Proposed | 12 items is too many for non-technical users. AI Visibility and Reports merge into Overview. | Current 12-item menu |
| D-32 | Plain-language wording everywhere (see the wording table in MVP_SPEC). | Decided | Users are local business owners and agency staff. | |
| D-33 | Customer usage: sidebar widget always visible, plus a Usage page (balance, per business, per model, forecast, history, Buy credits). | Decided | Jordan liked the Voxtell usage screen (07:52). | |
| D-34 | Redesign the homepage. Remove false claims (Gemini, fake testimonials, stock "team" photos, "AI recommends" on the compare tool) and repeated visual sections. | Decided | The current homepage is messy and makes claims the product does not meet. | Small fixes only |
| D-35 | Admin menu: Overview, Agencies, Businesses, Scans, Usage & Cost, Settings. Actions: add or remove credits, extend trial, suspend, retry failed scans, admin action log. | Proposed | Current admin has 12 items and no credit tools. | Keeping current admin |
| D-36 | Design reference: clean and simple, in the style of Voxtell AI. | Ask Jordan | Jordan liked Ehtisham's Voxtell work (07:50 to 07:52). | |

## 7. Emails

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-37 | MVP emails: welcome, trial ending, payment failed, low credits (80% and 0), weekly report. | Decided | Covers the money moments and keeps users engaged. | No emails |

## 8. Payments

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-38 | Our own checkout page, built with Stripe Checkout Sessions plus the Payment Element. Card fields stay in Stripe's secure frames. | Proposed | Our design and flow, while Stripe handles card security. | Stripe-hosted checkout page; handling cards ourselves (PCI burden) |
| D-39 | Webhooks are required (payments, renewals, failures, trial ending). Use a Stripe restricted API key and a separate Stripe sandbox for development. | Decided | Stripe requirement for subscriptions. | |
| D-40 | Use Jordan's own Stripe account (his LLC). The current keys point to a "WorkNex sandbox" account. | Ask Jordan | Money must go to the client's business. | Keeping the WorkNex account |

## 9. Infrastructure

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-41 | Hosting: test the rebuilt app on Netlify first (preview deploy with Cache Components on and a real scan through the worker). Stay on Netlify if everything works; move to Vercel only if something breaks. Database and auth stay on Supabase. (Updated 2026-09-26.) | Decided | Netlify limits (checked 2026-09-26): 60-second normal functions, 15-minute background functions; enough if the worker runs as a background function or stays under 60 seconds. Vercel's advantage: it is a Next.js verified adapter (full Next.js test suite), while Netlify's integration is "not verified… feature support may vary" (Next.js 16 docs, `17-deploying.md`). Staying avoids a DNS and webhook move. Correction: an earlier version of this row wrongly said Netlify's limit was 10 to 26 seconds. B-08 test (2026-09-26, deploy preview of PR #23, Cache Components on): build passed; every marketing page, login, signup and legal page served as prerendered HTML from Netlify's durable cache (`sitemap.xml` with its 1-day lifetime); logged-out `/dashboard` and `/internal/admin` redirect to login; cut-page redirects work; login reaches Supabase and shows the wrong-password message. Not yet checked on Netlify: logged-in dashboard and admin (needs a live test login) and the worker (not built yet). | Moving to Vercel up front without testing |
| D-42 | Background scans use a `scan_jobs` table in Supabase, scheduled by Supabase pg_cron, which calls the worker endpoint (a Netlify background function, or a Vercel route if we move, D-41) through pg_net. No Vercel Cron. | Decided | Free per-minute scheduling, jobs visible in the database, credits charged per job. | Vercel Cron (per-minute needs Pro); Upstash QStash; Inngest (overkill for now) |
| D-43 | One Supabase database for now. Back up before each migration. Only add tables and columns until the MVP is live. | Decided | No need for a second project yet; the live site shares the database. | Separate dev and prod databases (later) |
| D-44 | Error tracking and analytics come after the MVP. | Decided | Not needed to launch. | Sentry and PostHog now |
| D-45 | Git and branches (updated 2026-09-26): Netlify auto-publish from `main` stays on, so `main` always equals the live site. Two kinds of branches: (1) one long-lived `mvp` branch for the rebuild, deployed by Netlify as a staging site, collecting many tasks and merged into `main` once at go-live (B-80); (2) short-lived task branches `task/B-xx-name`, one task each, merged by pull request into `main` (safe for the live site) or into `mvp` (part of the rebuild). Every task in the build plan names its branch. `main` is merged into `mvp` at least weekly. Backup tag `original-backup` kept. | Decided | Live site stays safe without pausing deploys; safety fixes and invisible groundwork still reach production early; the rebuild is tested at its own URL. | Pausing Netlify auto-publish; committing directly to `main`; one branch per phase |

## 10. Design

Full system in [design/DESIGN.md](./design/DESIGN.md); visual sample in [design/palette-preview.html](./design/palette-preview.html).

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-46 | Keep blue as the brand colour: `#2563EB` (hover `#1D4ED8`, tint `#EFF6FF`). One blue only. | Decided | Existing brand; strong and passes contrast (white on it 5.2:1). | Soft slate blue `#3D6DC4` (tried, too weak); three different blues as today |
| D-47 | Light mode only for the MVP. | Decided | Less work; dark mode later if asked. | Light and dark |
| D-48 | shadcn/ui on Tailwind v4, themed with our tokens; shadcn charts; Lucide icons. | Decided | Consistent, accessible building blocks. | Custom components with hard-coded colours (today) |
| D-49 | Near-sharp corners: 4px (buttons, inputs, cards), 3px badges, 2px bars. | Decided | Crisp and precise look. | Fully sharp 0 to 2px; rounded 6px or more |
| D-50 | Warm neutral canvas (`#FAFAF8`), Geist font, tabular numbers, contrast-checked text and status colours. | Decided | Calm premium feel, WCAG AA. | |
| D-51 | Build the design straight away, no mockup approval round with Jordan. | Decided | Jordan gave full design freedom (07:49). | Mockups first |
| D-52 | Homepage is rebuilt as a fresh page, reusing about 40% (section structure, compare box logic, demo content, chart helper, FAQ and How it works text, agency pitch). | Decided | Current file has 2,616 lines, 536 hard-coded colours, rounded styling that clashes with D-49, and about 900 lines of dead code. | Restyling the existing file |

## 11. Credit and billing rules

Details in [MVP_SPEC.md](./MVP_SPEC.md) sections 4.2, 11.4, 11.5 and 13.

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-53 | Hold, charge, release: a scan holds its credits at start, each successful check (including cache hits) is charged, failed checks are released, leftovers released at the end. | Decided | Users never pay for our errors; retries never double-charge. Same pattern as card authorisations. | Charging failed checks; charging the whole scan up front |
| D-54 | A scan that started always finishes. It may overdraw the pool by at most one scan; the negative amount is taken from the next grant. No new scan starts at 0 or below. | Decided | Users never get half a report; the loss is capped. | Stopping scans mid-way |
| D-55 | Credits change only through SQL functions that lock the agency row in one transaction. One queued or running job per business (unique index). Every ledger row has a unique source key. | Decided | App-level checks race; the database lock cannot be bypassed. Replays can never apply twice. | Balance checks in application code |
| D-56 | One Stripe subscription per agency, one item per business, one renewal date. USD only, automatic currency conversion off. | Decided | Simple invoices; the trial covers the whole subscription. Test checkout showed PKR. | One subscription per business |
| D-57 | Plan changes: upgrade and add business now (prorated charge and credits); downgrade, remove business and cancel at period end (no refund). Failed payment: Stripe retries, scheduled scans pause at once. Refunds: none on plans, unused top-ups within 14 days. Top-ups only usable with an active plan. | Decided | Standard SaaS practice; blocks "upgrade, use credits, downgrade for a refund". | Immediate downgrades with refunds |
| D-58 | Credits are stored as grants (each with amount, remaining, expiry, source), spent soonest-expiring first, with an append-only transaction ledger. Plans (price, credits, limits, Stripe price ID) live in a database table. | Decided | One design covers plan credits, top-ups, trials, promos, prorations and refunds with no schema changes later; prices change without a deploy. Same model as prepaid-credit systems like OpenAI's and Stripe billing credits. | Two balance columns (plan / top-up) on the agency |

## 12. Architecture

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-59 | Code layout (refined 2026-09-26): thin routes in `src/app` with route groups; each feature in `src/modules/<feature>` has `dal.ts` (server-only data access with auth checks), `actions.ts`, `service.ts`, `schema.ts`, `prompts/` and tests. Full layout and 14 rules in MVP_SPEC section 18. | Decided | Matches the Next.js 16 docs' Data Access Layer recommendation for new projects; today the logic is scattered, files are huge and limit checks are never called. | Keeping the current `lib/geo` / `components/geo` layout |
| D-60 | One entitlements module answers every "can this agency do X?" question; every route that spends money or adds data calls it. | Decided | Today's `entitlements.ts` has the checks but no route calls them. | Checks scattered in each route |
| D-61 | Agencies can be marked `is_test`; the worker skips real AI calls for them. | Proposed | One shared database (D-43) means testing must not spend real credits or money. | Separate database (later) |

## 13. Moving to the new system

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-69 | Existing data moves through additive, idempotent SQL migrations with a backup, verification and a 30-day grace period before old tables are dropped. Stripe data is not carried over (it is WorkNex sandbox test data). Plan in MVP_SPEC section 19. | Proposed | Only 9 profiles and 5 businesses exist today, but a scripted move can be rehearsed and rolled back. | Editing tables in place |
| D-70 | Go-live on the chosen host (D-41): Netlify path = new environment variables, worker as a background function, merge `mvp` into `main`; Vercel path = preview test, DNS switch, Netlify kept 7 days as fallback. Plan in MVP_SPEC section 20. | Proposed | Either path has no downtime and an easy rollback. | Switching hosts in one step |

## 14. Tools, quality and compliance

| ID | Decision | Status | Why | Rejected |
|---|---|---|---|---|
| D-71 | PDFs: print the share page through Browserless (hosted Chrome) behind one `renderPdf(url)` function. Fallbacks: our own headless Chrome in a function, and browser print styling. Weekly emails link to the share page instead of attaching PDFs. | Decided | One report design for web and PDF, charts print exactly; hosted Chrome is the most reliable with no upkeep; free plan covers 1,000 PDFs a month (checked 2026-09-26). Input is just a URL, so switching provider is small. | React PDF (report built twice, charts rebuilt); DocRaptor (weak JavaScript, ownership changed twice in 2025); PDFShift and PDFBolt (small or new); own Chrome as primary (upkeep) |
| D-72 | Emails: React Email templates sent through Resend. | Decided | Standard, templates in React; Resend key already exists. | |
| D-73 | Google Places: store only `place_id`; fetch ratings and details live with attribution; Places only pre-fills onboarding forms; competitor names confirmed by the user; explanations use placeholders filled with live data. | Decided (legal reading to confirm) | Google's terms forbid saving business names, addresses and reviews and allow caching only `place_id` (and lat/lng for 30 days). Quoted in MVP_SPEC section 26. | Storing Places data monthly (breaks the terms) |
| D-74 | "Also recommended by AI": Claude Haiku extracts business names from each answer; stored with the cached answer; Batches API for scheduled scans; no extra credits. | Decided | About $0.0014 per check, absorbed by the margin. | Charging extra credits; skipping the feature |
| D-75 | Testing: Vitest unit and integration tests, Stripe CLI webhook fixtures, Playwright end-to-end, all on every pull request, plus a written definition of done (MVP_SPEC section 21). | Decided | Credits and money need tests; Vitest cannot render async Server Components. | Manual testing only |
| D-76 | Alerts without Sentry: pg_cron checks every 15 minutes and emails the admin (failed scans, stuck jobs, webhook failures, provider errors, negative balances, daily AI cost). | Decided | Uses tables we already have; no new service. | Sentry now (after the MVP, D-44) |
| D-77 | Account and business deletion: soft delete at once, permanent deletion after 30 days by pg_cron, invoices kept in Stripe, credit history anonymised. | Decided (legal deadlines to confirm) | Allows undo for mistakes; meets typical deletion laws. | Immediate hard delete; no self-service deletion |
| D-78 | Terms and Privacy must be updated before launch (list in MVP_SPEC section 24). | Ask Jordan (lawyer review) | Legal text; trial auto-charge and auto-renewal rules vary by state. | |
| D-79 | Engineering rules: Data Access Layer per feature, auth checked in every action and route, `proxy.ts` for redirects only, validated env, generated DB types, `getUser`/`getClaims` only, RLS everywhere, feature boundaries and file size enforced by lint in CI (MVP_SPEC 18.1). | Decided | From the Next.js 16 docs in this repo and Supabase/Stripe guidance; enforced by tooling so it holds when people change. | Rules by convention only |
| D-80 | Turn on Next.js 16 Cache Components (`cacheComponents: true`) at the start of the rebuild. | Decided | It is off today; switching later changes caching everywhere. | Staying on the old caching model |
| D-81 | AI evals with `vitest-evals` (plus `autoevals` scorers) in an `evals/` folder: six suites, code graders first, calibrated AI graders, fast suite on every PR, AI-graded suite on prompt or model change (MVP_SPEC section 25). | Decided | Protects the AI parts that drive scores and advice; in-repo, no lock-in. vitest-evals is actively maintained (updated 2026-09-10). | Hosted eval platforms (LangSmith, Braintrust platform); evalite (last updated February 2026) |
| D-82 | Malware and secret protection in the repo: payload and secret scanners (self-testing) run on commit, on push (full tree of each pushed commit), after checkout and merge (warning), before `dev` and `build` (blocks Netlify builds of infected code), and in GitHub Actions (Security and CI). Never bypass with `--no-verify`. Done in PR #4 (2026-09-26). | Decided | The same malware family hit this repo (from 2026-08-12) and the GCS repo; it arrived in harmless-looking commits and a VS Code auto-run task. | Relying on manual review |

---

## Ask Jordan

Send when he is back (about 14 days from 2026-09-25).

- [ ] Plan prices: Starter $149 (1,200 credits) and Pro $249 (2,500 credits) per business per month? (D-21)
- [ ] Card required for the trial: OK? (D-15; the meeting talked about free testing)
- [ ] His Stripe account for the LLC, and who sets it up (D-40)
- [ ] Businesses with no website in the MVP: OK? (D-08)
- [ ] LinkedIn Studio: does he use it? Keep or remove (D-07)
- [ ] Final cut list of products and pages (D-04, D-05)
- [ ] Design reference: the Voxtell style? (D-36)
- [ ] Change all API keys (malware found in the repo; his commit `80d3b13` brought it in, so his machine may be infected)
- [ ] Budget, milestones and launch date (T8)
- [ ] Who controls the domain's DNS settings (needed for the Vercel move, D-70)
- [ ] Existing beta users at launch: fresh 7-day trial with 100 credits? (D-69)
- [ ] New Anthropic and Perplexity API keys (the local setup only has an OpenAI key)
- [ ] Lawyer (or Jordan) review: Terms and Privacy updates (D-78), our reading of Google's Places terms (D-73), and deletion deadlines (D-77)
