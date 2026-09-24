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
| D-06 | Drop Search Intelligence (DataForSEO) from the MVP. Use Google Places and AI citations for "why competitors win" instead. | Proposed | Google SEO data is not AI visibility and costs money per call. Places data is more relevant for local. | Keeping it as a menu item; merging DataForSEO data into Competitors |
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
| D-29 | Questions are written by Claude Haiku 4.5 at onboarding, tailored to business type, services and city. The user reviews and edits. Templates stay as a fallback. | Decided | Natural, industry-specific questions (Jordan's per-industry prompts request). | Templates only |
| D-30 | Claude Haiku 4.5 (`claude-haiku-4-5`) for auto-fill and question writing. Claude Sonnet 5 (`claude-sonnet-5`) for "why competitors win" explanations. | Decided | Cheap model where quality matters less, stronger model where it matters (07:36). | One model for everything |

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
| D-41 | Host on Vercel. Database and auth stay on Supabase. | Proposed | 300-second function time fits scans (Netlify's sync limit is 10 to 26 seconds, and a scan already takes 23). Preview link per branch. | Staying on Netlify |
| D-42 | Background scans use a `scan_jobs` table in Supabase, scheduled by Supabase pg_cron, which calls a Vercel worker endpoint through pg_net. No Vercel Cron. | Decided | Free per-minute scheduling, jobs visible in the database, credits charged per job. | Vercel Cron (per-minute needs Pro); Upstash QStash; Inngest (overkill for now) |
| D-43 | One Supabase database for now. Back up before each migration. Only add tables and columns until the MVP is live. | Decided | No need for a second project yet; the live site shares the database. | Separate dev and prod databases (later) |
| D-44 | Error tracking and analytics come after the MVP. | Decided | Not needed to launch. | Sentry and PostHog now |
| D-45 | Git: tag today's code as `original-backup`, then keep working on `main`. Pause Netlify auto-deploy if live changes are not wanted mid-build. | Proposed | Simplest way to keep a copy of the original. | New default branch |

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
