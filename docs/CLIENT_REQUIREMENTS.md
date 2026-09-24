# Client Requirements Tracker

Source: call between Jordan Nase (client) and Ehtisham Farman (developer), 07:28 to 08:01 PM. Timestamps below point into that transcript.

Code status comes from the live local audit on 2026-09-23. Decisions (IDs like `D-21`) are in [DECISIONS.md](./DECISIONS.md), the build plan is in [MVP_SPEC.md](./MVP_SPEC.md), and technical fixes are in [MVP_ROADMAP.md](./MVP_ROADMAP.md). This file tracks what the client asked for.

## How to use this file

- One section per topic, so each can be discussed on its own.
- **Status** values: `Not discussed`, `Discussing`, `Agreed`, `In progress`, `Done`, `Dropped`.
- After each discussion, fill in **Decisions** with the date, and tick the open questions that got answered.
- When a topic turns into build work, add task IDs (prefix `REQ-`) in **Tasks** and reference them in PR titles.

## Summary

| ID | Topic | Status | Code today | Decisions |
|---|---|---|---|---|
| T1 | Local first, not global | Agreed | Done: prompts are city-based | D-02 |
| T2 | Agencies as customers | Agreed | Partial: multi-business works, no agency workspace | D-03, D-10 to D-12, D-20 |
| T3 | AI at the core, low cost | Agreed | Partial: 1 AI model, no caching, template prompts | D-23, D-24, D-26 to D-30 |
| T4 | Pricing with credits | Agreed, prices to confirm | Missing: plans exist, no credits or top-ups | D-15 to D-25, D-38 to D-40 |
| T5 | Usage page | Agreed | Missing: usage is never recorded | D-25, D-33, D-35 |
| T6 | Redesign and trimming | Agreed | Not started | D-01, D-04 to D-06, D-14, D-18, D-31, D-32, D-34 to D-36 |
| T7 | Copy fix prompt for Claude | Agreed | Done: already built | D-09 |
| T8 | Business and budget | Open | n/a | |
| T9 | Businesses with no website or listing | Agreed by Ehtisham, confirm with Jordan | Missing: onboarding requires a website | D-08 |

---

## T1. Local first, not global

**Status:** Agreed

**What Jordan wants (07:28 to 07:39):** Target local businesses first ("start local", 07:37). Less competition, and much cheaper in AI tokens than competing on global queries. Global can come later.

**Code today:**
- Prompts are built from business type plus city, for example "What is the best Digital marketing agency in Orange, CA?". This already fits local.
- Competitor discovery uses Google Places and found 5 real local competitors in the audit.

**Open questions:**
- [ ] Which cities or regions launch first (Brandastic's clients are mostly Orange County / LA)?
- [ ] US only at launch?

**Decisions:**
- 2026-09-25: Local first, global later (D-02).

**Tasks:**
-

---

## T2. Agencies as customers

**Status:** Agreed

**What Jordan wants (07:31 to 07:33, 07:42):**
- Agencies sign up once, as a workspace with their company name.
- They add all their client businesses (restaurants, lawyers, dentists).
- Each business has its own dashboard and its own prompts; the agency switches between them.
- The agency pays per business added, so an agency with 20 clients adds all 20.

**Code today:**
- One login can own many businesses, and a business switcher exists in the dashboard.
- There is no agency or workspace entity: no agency name, no team members, no invites.
- Billing is already per business (one Stripe subscription item per business).

**Open questions:**
- [x] Do agency staff need separate logins (team members and roles)? No, one login in the MVP (D-10).
- [x] Should the agency's end clients be able to log in? No; they get a PDF or share link (D-11).
- [x] White-label reports with the agency's logo: MVP or later? Agency logo on the PDF in the MVP; full white-label later (D-12).

**Decisions:**
- 2026-09-25: One login per agency; team members and roles later (D-10).
- 2026-09-25: No client logins; Export PDF and Share link instead (D-11, D-12).
- 2026-09-25: Plans priced per business; all credits go into one agency pool (D-20).

**Tasks:**
-

---

## T3. AI at the core, at low cost

**Status:** Agreed

**What Jordan wants (07:33 to 07:37):**
- AI is "the whole point" of the product.
- Save tokens: cache answers so repeated queries are not paid for twice.
- Cheap models (Haiku) where quality matters less, stronger Claude models only where needed. Claude first, OpenAI when needed.
- Different prompts for each industry instead of one generic prompt.

**Code today:**
- Each scan only asks ONE AI model (the first configured, usually ChatGPT), while plans promise 3. See roadmap CORE-01.
- Prompts come from a fixed template, not AI.
- No caching of AI answers.
- Models in use are already cheap: `gpt-4o-mini`, `claude-3-5-haiku` (old snapshot), `sonar`.
- The Direct Agent chat works, but its answers are generic.
- Website auto-detection failed on brandastic.com because Cloudflare blocks the scanner (403).

**Open questions:**
- [x] Which AI models must be covered at launch? ChatGPT, Claude and Perplexity; Gemini later (D-26).
- [x] Which industries get their own prompt templates first? None needed: Claude writes questions per business (D-29).
- [x] How long can a cached answer be reused? 24 hours (D-24).

**Decisions:**
- 2026-09-25: Track ChatGPT, Claude and Perplexity with web search, all on by default, user can turn models off (D-26).
- 2026-09-25: Claude Haiku 4.5 writes questions and fills in business details; Claude Sonnet 5 explains why competitors win (D-29, D-30).
- 2026-09-25: 24-hour answer cache, still charged 1 credit (D-24).
- 2026-09-25: Direct Agent chat cut from the MVP (D-05).

**Tasks:**
-

---

## T4. Pricing with credits

**Status:** Agreed, prices to confirm with Jordan

**What Jordan wants (07:33, 07:39 to 07:43):**
- Monthly plans of about $150 to $250 that include a number of tokens or credits.
- Top-ups to buy more tokens for more prompts.
- Free trial with some free tokens, then block usage and ask to upgrade.
- Trial allows 2 businesses; adding a 3rd asks to upgrade (07:43).

**Code today:**
- Plans exist: Starter $149, Growth $297, Pro $497 per business per month, limited by prompts and competitors. No credits or top-ups.
- Trial allows 1 business (`src/config/pricing.ts:40`), not 2.
- Plan limits exist in code but are never enforced, so an unpaid account got full access in the audit. See roadmap CORE-05.
- Stripe keys point to a "WorkNex sandbox" account, not Jordan's own Stripe.

**Open questions:**
- [x] What is one credit worth? 1 question on 1 AI model (D-19).
- [ ] Final plan prices and credits per plan? Proposed Starter $149 / 1,200 credits, Pro $249 / 2,500 credits (D-21, Ask Jordan).
- [ ] Top-up packs and prices? Proposed 500 for $50, 2,000 for $180 (D-22).
- [x] How many free credits in the trial, and how many days? 7 days, 2 businesses; 100 credits proposed (D-16, D-17).
- [x] Does a card have to be entered to start the trial? Yes (D-15); confirm with Jordan.
- [ ] Which Stripe account (Jordan's LLC) and who sets it up? (D-40, Ask Jordan)

**Decisions:**
- 2026-09-25: Plan chosen on the pricing page before signup; card at the end of onboarding; auto-charged on day 7 (D-13 to D-16).
- 2026-09-25: Plans per business, one credit pool per agency, top-ups (D-20, D-22).
- 2026-09-25: Every check costs 1 credit with web search, about $0.10 per credit (D-23, Proposed).
- 2026-09-25: At 0 credits every scan stops (D-25).
- 2026-09-25: Own checkout page with Stripe Checkout Sessions and Payment Element (D-38, Proposed).

**Tasks:**
-

---

## T5. Usage page

**Status:** Agreed

**What Jordan wants (07:41, 07:52):**
- Customers see tokens used, tokens left, and prompts run, like the Voxtell AI usage screen Ehtisham showed.
- When credits run out: block and show "please upgrade your plan".
- Admin side: see usage per customer to decide plan limits.

**Code today:**
- A usage ledger exists (`src/lib/billing/usage.ts`) but is never called, so nothing is recorded. See roadmap CORE-06.
- The billing page has a Usage tab, and the admin panel has a usage page; both stay empty.

**Open questions:**
- [x] Show usage per business, per agency, or both? Both: pool balance plus breakdown by business and model (D-33).
- [x] Warn at what level? 80% used and at 0 (D-25).

**Decisions:**
- 2026-09-25: Sidebar usage widget plus a Usage page, modelled on Voxtell's usage status (D-33).
- 2026-09-25: Admin Usage & Cost page with credits used and real AI cost (D-35).

**Tasks:**
-

---

## T6. Redesign and trimming

**Status:** Agreed

**What Jordan wants (07:48 to 07:54):**
- Remove everything that does not help the MVP ("if it doesn't help the MVP just get rid of it", 07:48).
- Clean onboarding: company name, then domain, then choose plan, then dashboard.
- AI fills in the company details from the domain, so the user types almost nothing.
- Simple, good-looking dashboard and admin panel.
- Jordan gave Ehtisham full design freedom, including payment pages.

**Code today:**
- Side products still in the site: `/ai-phone` and `/ai-employee`, `/dm-ads`, `/ads`, `/call-bar`, `/sales`, `/home-2`, admin newsroom, prospecting.
- Onboarding flow today: website, confirm details, competitors, prompts, first scan. No company name step and no plan step.
- Name and description are auto-filled from the site when it can be read; industry is always left for the user.

**Open questions:**
- [ ] Final list of pages and features to remove (confirm with Jordan). Proposed list in MVP_SPEC section 17.
- [ ] Is there a design reference or brand guide to follow? Proposed: Voxtell AI style (D-36, Ask Jordan).
- [x] Should plan selection happen before or after the first scan? Before signup, on the pricing page (D-13).

**Decisions:**
- 2026-09-25: Cut the separate products and Direct Agent, Request Fix, Agent Readiness; Search Intelligence dropped (proposed) (D-04 to D-06).
- 2026-09-25: Onboarding flow: account, agency name, business, auto-filled details, competitors, questions, models and frequency, card, first scan (D-14).
- 2026-09-25: Details auto-filled with Firecrawl, Google Places and Claude Haiku (D-18, Proposed).
- 2026-09-25: Dashboard menu down to 6 items; plain-language wording; homepage redesign; admin menu down to 6 items (D-31, D-32, D-34, D-35).
- 2026-09-25: LinkedIn Studio kept until Jordan answers (D-07).

**Tasks:**
-

---

## T7. Copy fix prompt for Claude

**Status:** Agreed (already built)

**What Jordan wants (07:54):** For each gap found, give the agency a ready prompt to paste into Claude to fix the client's website.

**Code today:**
- Already built. "Copy for Claude" on Opportunities works. The audit copied a clear 775-character prompt with business context and a rule against invented facts.

**Open questions:**
- [ ] Is the current prompt wording good enough, or should it change?

**Decisions:**
- 2026-09-25: Keep it (D-09). "Fix with Claude" on Agent Readiness goes away with that page.

**Tasks:**
-

---

## T8. Business and budget

**Status:** Open

**What was said (07:44 to 07:48, 07:57):**
- The budget is tight for now; Jordan will get more funding once the MVP brings in paying users.
- First customer: Brandastic (brandastic.com), the agency Jordan runs with his brother. Then other agencies they know.
- Jordan wants more regular calls and hopes to hire Ehtisham full-time.

**Open questions:**
- [ ] Agreed budget and milestones for the MVP?
- [ ] Launch date target?
- [ ] Regular call schedule?

**Decisions:**
-

---

## T9. Businesses with no website or listing

**Status:** Agreed by Ehtisham for the MVP (light version); confirm with Jordan. Not raised in the call.

**Why it matters:** Many local businesses have no website, no Google Business Profile and no listings. AI assistants can only recommend businesses they can find online, so these owners score 0% today and have no way into the product.

**Proposed flow:**
1. **Signup:** an "I don't have a website" option on the first onboarding step. The owner types business name, type (for example "coffee shop"), city, phone and address. The website scan is skipped.
2. **First scan:** same customer questions ("best coffee shop in Orange, CA"). Mentions are matched by name plus phone plus city, since there is no domain. Expected result is 0%, shown in plain words: "AI can't recommend you because it can't find you online. These 5 shops show up instead."
3. **Competitors:** who AI picks instead and why, for example "Google listing, 320 reviews at 4.7, website with menu and hours", side by side with what the business has.
4. **Opportunities as a checklist** instead of website fixes:
   - Create a Google Business Profile (step-by-step guide)
   - Add free Yelp, Bing Places and Apple Business Connect listings
   - Get the first 10 reviews (message template to send customers)
   - Keep name, address and phone identical everywhere
   - Build a simple one-page website ("Copy for Claude" prompt, or ask the agency)
   - List in local and industry directories
   Each item can be ticked off, and verified where possible (for example a Google Places lookup confirms the listing exists).
5. **Progress:** weekly rescans show the move from 0% to first mentions.
6. **Agency angle:** agencies can sell the whole checklist as a "get online" package (listings, reviews, website).

**Code today:**
- Onboarding requires a website URL and has no skip option (`src/components/geo/OnboardingWizard.tsx:63`).
- The backend already allows a business with no domain (`domain` is optional in `/api/geo/businesses`).
- Mention matching is a plain name substring check, which will over-count generic names like "Best Plumbing" (roadmap CORE-03).

**To build:**
- [ ] "No website" onboarding path (MVP)
- [ ] Mention matching by name, phone and city (MVP)
- [ ] Fixed "get found by AI" checklist (MVP)
- [ ] Listing check through Google Places (later)
- [ ] Checklist progress tracking with automatic verification (later)

**Open questions:**
- [ ] Does Jordan want these businesses at launch?
- [ ] Cheaper plan or fewer credits for them?

**Decisions:**
- 2026-09-25: Light version in the MVP (D-08); confirm with Jordan.

**Tasks:**
-

---

## Ask Jordan

The full list, with decision links, is at the bottom of [DECISIONS.md](./DECISIONS.md#ask-jordan). Summary:

- [ ] Plan prices ($149 / $249 per business) and credits per plan
- [ ] Card required for the trial
- [ ] His Stripe account (LLC) and who sets it up
- [ ] Businesses with no website in the MVP
- [ ] LinkedIn Studio: keep or remove
- [ ] Final cut list
- [ ] Design reference (Voxtell style)
- [ ] Change all API keys (malware incident)
- [ ] Budget, milestones, launch date
