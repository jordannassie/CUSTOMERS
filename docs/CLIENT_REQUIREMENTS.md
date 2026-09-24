# Client Requirements Tracker

Source: call between Jordan Nase (client) and Ehtisham Farman (developer), 07:28 to 08:01 PM. Timestamps below point into that transcript.

Code status comes from the live local audit on 2026-09-23. Technical fixes (security, bugs, reliability) live in [MVP_ROADMAP.md](./MVP_ROADMAP.md); this file tracks what the client asked for.

## How to use this file

- One section per topic, so each can be discussed on its own.
- **Status** values: `Not discussed`, `Discussing`, `Agreed`, `In progress`, `Done`, `Dropped`.
- After each discussion, fill in **Decisions** with the date, and tick the open questions that got answered.
- When a topic turns into build work, add task IDs (prefix `REQ-`) in **Tasks** and reference them in PR titles.

## Summary

| ID | Topic | Status | Code today |
|---|---|---|---|
| T1 | Local first, not global | Agreed in call | Done: prompts are city-based |
| T2 | Agencies as customers | Agreed in call | Partial: multi-business works, no agency workspace |
| T3 | AI at the core, low cost | Agreed in call | Partial: 1 AI model, no caching, template prompts |
| T4 | Pricing with credits | Agreed in call | Missing: plans exist, no credits or top-ups |
| T5 | Usage page | Agreed in call | Missing: usage is never recorded |
| T6 | Redesign and trimming | Agreed in call | Not started |
| T7 | Copy fix prompt for Claude | Agreed in call | Done: already built |
| T8 | Business and budget | Open | n/a |
| T9 | Businesses with no website or listing | Proposed | Missing: onboarding requires a website |

---

## T1. Local first, not global

**Status:** Agreed in call

**What Jordan wants (07:28 to 07:39):** Target local businesses first ("start local", 07:37). Less competition, and much cheaper in AI tokens than competing on global queries. Global can come later.

**Code today:**
- Prompts are built from business type plus city, for example "What is the best Digital marketing agency in Orange, CA?". This already fits local.
- Competitor discovery uses Google Places and found 5 real local competitors in the audit.

**Open questions:**
- [ ] Which cities or regions launch first (Brandastic's clients are mostly Orange County / LA)?
- [ ] US only at launch?

**Decisions:**
-

**Tasks:**
-

---

## T2. Agencies as customers

**Status:** Agreed in call

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
- [ ] Do agency staff need separate logins (team members and roles)?
- [ ] Should the agency's end clients be able to log in and see their own dashboard?
- [ ] White-label reports with the agency's logo: MVP or later?

**Decisions:**
-

**Tasks:**
-

---

## T3. AI at the core, at low cost

**Status:** Agreed in call

**What Jordan wants (07:33 to 07:37):**
- AI is "the whole point" of the product.
- Save tokens: cache answers so repeated queries are not paid for twice.
- Cheap models (Haiku) where quality matters less, stronger Claude models only where needed. Claude first, OpenAI when needed.
- Different prompts for each industry instead of one generic prompt.

**Code today:**
- Each scan only asks ONE AI model (the first configured, usually ChatGPT), while plans promise 3. See roadmap CORE-01.
- Prompts come from a fixed template, not AI.
- No caching of AI answers.
- Models in use are already cheap: `gpt-4o-mini`, `claude-3-5-haiku`, `sonar`.
- The Direct Agent chat works, but its answers are generic.
- Website auto-detection failed on brandastic.com because Cloudflare blocks the scanner (403).

**Open questions:**
- [ ] Which AI models must be covered at launch: ChatGPT, Claude, Perplexity, Gemini?
- [ ] Which industries get their own prompt templates first?
- [ ] How long can a cached answer be reused (a day, a week)?

**Decisions:**
-

**Tasks:**
-

---

## T4. Pricing with credits

**Status:** Agreed in call

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
- [ ] What is one credit worth (one prompt checked on one AI model)?
- [ ] Final plan prices and credits per plan?
- [ ] Top-up packs and prices?
- [ ] How many free credits in the trial, and how many days?
- [ ] Does a card have to be entered to start the trial?
- [ ] Which Stripe account (Jordan's LLC) and who sets it up?

**Decisions:**
-

**Tasks:**
-

---

## T5. Usage page

**Status:** Agreed in call

**What Jordan wants (07:41, 07:52):**
- Customers see tokens used, tokens left, and prompts run, like the Workstill AI usage screen Ehtisham showed.
- When credits run out: block and show "please upgrade your plan".
- Admin side: see usage per customer to decide plan limits.

**Code today:**
- A usage ledger exists (`src/lib/billing/usage.ts`) but is never called, so nothing is recorded. See roadmap CORE-06.
- The billing page has a Usage tab, and the admin panel has a usage page; both stay empty.

**Open questions:**
- [ ] Show usage per business, per agency, or both?
- [ ] Warn at what level (for example 80% used)?

**Decisions:**
-

**Tasks:**
-

---

## T6. Redesign and trimming

**Status:** Agreed in call

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
- [ ] Final list of pages and features to remove (confirm with Jordan).
- [ ] Is there a design reference or brand guide to follow?
- [ ] Should plan selection happen before or after the first scan?

**Decisions:**
-

**Tasks:**
-

---

## T7. Copy fix prompt for Claude

**Status:** Agreed in call

**What Jordan wants (07:54):** For each gap found, give the agency a ready prompt to paste into Claude to fix the client's website.

**Code today:**
- Already built. "Copy for Claude" on Opportunities and "Fix with Claude" on Agent Readiness both work. The audit copied a clear 775-character prompt with business context and a rule against invented facts.

**Open questions:**
- [ ] Is the current prompt wording good enough, or should it change?

**Decisions:**
-

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

**Status:** Proposed (not raised in the call; came up in planning)

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
- [ ] "No website" onboarding path
- [ ] Mention matching by name, phone and city
- [ ] Opportunity rules for businesses with no web presence
- [ ] Listing check through Google Places
- [ ] Checklist with progress tracking

**Open questions:**
- [ ] Does Jordan want to target these businesses at launch, or only businesses with a website?
- [ ] Cheaper plan or fewer credits for them?

**Decisions:**
-

**Tasks:**
-
