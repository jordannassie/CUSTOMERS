# Phase 9: Marketing site

Goal: an honest, premium public site that explains the AEO tool and sends visitors to pricing and signup. Can run in parallel with phases 2 to 5 (needs only B-09 and, for prices, B-40). [Back to index](./README.md)

---

### B-70 Header, footer and section building blocks
- [ ] Done

Phase 9 · M · Depends on: B-09 · Blocked by Jordan: no · MVP_SPEC 12, D-52, design/DESIGN.md

**Build**
1. `components/marketing/Header.tsx`: logo, Product, Pricing, Agencies, FAQ, Log in, blue "Start free trial"; plain (no gradient pill); phone menu.
2. `components/marketing/Footer.tsx`: product links, "Tracks ChatGPT, Claude and Perplexity" (no Gemini), legal links, Google attribution note if Places data appears on the page.
3. Section primitives: `Section`, `Eyebrow`, `H2`, `Lead`, `FeatureRow`, `CTA`.
4. Replace `SiteHeader.tsx` and `SiteFooter.tsx`.

**What the user sees**
- A clean, consistent header and footer on every public page, desktop and phone.

**Engineering checks**
- Lighthouse accessibility at least 95 on a page using them.

---

### B-71 New homepage
- [ ] Done

Phase 9 · L · Depends on: B-70 · Blocked by Jordan: no · MVP_SPEC 12.2, D-34, D-52

**Build**
1. `src/app/(marketing)/page.tsx` with sections, one file each under `components/marketing/home/`: hero with the compare box, how it works (measure, compare, fix, track), product tabs (Visibility, Competitors, Fix steps) clearly labelled "Example", for agencies, pricing summary from the `plans` table, FAQ, final call to action.
2. Carry over from `HomepagePlatform.tsx`: section story, `HeroCompareBar` logic (restyled), demo content, `MiniChart` and `smoothPath`, FAQ and how-it-works text with claims fixed, agency pitch.
3. Remove: Gemini and Google AI claims, fake testimonials and stock photos, AI-made "team photo", video, banner and shopper sections, agent-readiness section, old pricing table, "No credit card required".
4. Delete `HomepagePlatform.tsx` (2,616 lines) and unused section components when the new page is complete.
5. Page metadata, Open Graph image.

**What the user sees**
- A calm, premium homepage that clearly says what the product does, shows an honest example, and leads to pricing or a free check.
- Nothing claims features that do not exist.

**Engineering checks**
- Lighthouse: performance at least 90, accessibility at least 95 (desktop and mobile), scores in the PR.
- Screenshots at 1440px and 390px compared with the DESIGN.md sample.

---

### B-72 Pricing, agency and contact pages
- [ ] Done

Phase 9 · M · Depends on: B-70, B-40 · Blocked by Jordan: final prices (D-21) · MVP_SPEC 12.1, 4.1, 4.4

**Build**
1. Pricing: Starter and Pro from the `plans` table, per business per month, credits included, what a credit is, top-up packs, the 7-day trial with card and its charge date rule, FAQ. "Choose plan" goes to signup with `?plan=`.
2. Agency page: keep the pitch; remove the speculative revenue table or label it clearly as an example; link to pricing.
3. Contact page: AEO topics only; no ChatGPT Ads; no stock "team" photo.
4. Per-page metadata for all three.

**What the user sees**
- Clear prices that match what they will be charged, with the trial terms stated plainly.

**Engineering checks**
- Test: prices on the page equal the `plans` table values.

---

### B-73 Free compare tool made honest
- [ ] Done

Phase 9 · M · Depends on: B-70, B-22 · Blocked by Jordan: no · MVP_SPEC 12.3

**Build**
Choose one at build time (record in DECISIONS.md):
- **Option A (recommended)**: keep the current website check and rename it "AI readiness check: see how easy your site is for AI to understand". No AI calls, no cost.
- **Option B**: add one real Perplexity check for "best [category] in [city]" and show whether each site is mentioned. Costs about $0.01 per use; keep the existing per-IP rate limit and move it to a shared store (MVP_ROADMAP SEC-07).

Either way: the headline must describe what the tool actually measures, and the result page invites the visitor to start a trial for the full check.

**What the user sees**
- A free tool whose result matches its promise, with a clear next step.

**Engineering checks**
- Rate limit test (shared store) if option B.

---

### B-74 SEO basics
- [ ] Done

Phase 9 · S · Depends on: B-71, B-72 · Blocked by Jordan: no · MVP_ROADMAP GROW-02, GROW-03

**Build**
1. `sitemap.ts`: only kept public pages (home, pricing, agency, compare, contact, privacy, terms).
2. `robots.ts`: disallow app, admin, share pages and API.
3. JSON-LD Organization without removed products.
4. Unique title and description per page; Open Graph image in `src/app/opengraph-image.*`, icon in `src/app/icon.*`.

**What the user sees**
- Good-looking link previews when the site is shared; search results show the right pages.

**Engineering checks**
- Sitemap and robots output pasted in the PR; OG preview checked with a validator.

---

## Phase 9 demo checklist

1. Open the homepage on a laptop and a phone: it looks calm and premium, in strong blue with near-sharp corners.
2. Read it: nothing mentions Gemini, AI Employee, ads or fake reviews; examples are labelled "Example".
3. Try the free check: the result matches what the page promised.
4. Open Pricing: prices, credits and trial terms are clear; "Choose plan" goes to signup.
5. Share the homepage link in a chat app: a clean preview image appears.
