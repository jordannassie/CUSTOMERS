# Phase 11: Why you are behind

Owners saw "Competitor 22, you 21" and could not act on it. This phase shows where they stand against each competitor,
the likely reasons (with the facts behind them) and where to fix each one. Written 2026-10-26.

Phase A uses only what scans already saved: no new scan, AI call, website read, migration or extra Google call. Google
values appear only where the Competitors page already fetches them live (D-73). Wording says "likely reason" and "what
AI could see", never "the reason", since we cannot see inside the AI tools. [Back to the plan](./README.md)

---

### B-85 Standing facts from saved answers (Phase A1)
- [ ] Done (built in the working tree on `mvp-bugs-fixes`, not committed yet)

Phase 11 · M · Depends on: B-50, B-51 · Blocked by Jordan: no · MVP_SPEC 7.1, 7.2, D-63, D-73 · Branch: `task/B-85-standing-facts` → `mvp`

**Build**
1. `src/modules/standing/`: `dal.ts` reads the last 30 days of `visibility_results_counted` once per request (React cache), counting the same answers as the score (`splitByQuestion`).
2. `service.ts` and `reasons.ts` (pure): per competitor, the questions and AI tools where they beat you or you beat them; likely reasons with where to fix them (sites AI used in answers that named them and not you, AI using their website more than yours, a blocked website, Google values when given); where you lead.
3. `questions.ts` (pure): per question, who AI named (tracked and untracked) and the sites it used when it left you out.
4. Pure helpers moved to `src/lib` (`google-compare.ts`, `your-website.ts`, `siteOwner` in `site-type.ts`) so the scan worker bundle stays free of UI code.

**What the user sees**
- Nothing on its own; B-86 to B-89 show it.

**Engineering checks**
- Unit tests: ahead and behind never reversed, no listing advice on another business's website, a blocked site first, Google read from the owner's side.

---

### B-86 Competitors page: "See why" (Phase A2)
- [ ] Done (built, not committed)

Phase 11 · M · Depends on: B-85 · Blocked by Jordan: no · MVP_SPEC 8.1, D-73 · Branch: `task/B-86-see-why` → `mvp`

**Build**
1. "See why" under each competitor compared over the whole 30 days opens a side panel (`WhySheet.tsx`): standing sentence, where they beat you, likely reasons with "Fix on" labels, Google lines from the values the page already fetched (with attribution), where you lead, and the fixes that mention them.
2. `/competitors?why=<competitor id>` opens that panel (used by B-89).

**What the user sees**
- "AI named Bean House in 12 of 15 answers over the last 30 days, and you in 3", the questions they win, and why AI may prefer them, each with where to fix it.

---

### B-87 Questions page: who won each question (Phase A3)
- [ ] Done (built, not committed)

Phase 11 · S · Depends on: B-85 · Blocked by Jordan: no · MVP_SPEC 5.3, 8.1 · Branch: `task/B-87-question-winners` → `mvp`

**What the user sees**
- Under each active question: "AI named most: Bean House (12 of 15 answers), Blue Door Coffee (6)" and "Sites AI used when it left you out: yelp.com (9)", with a "See the answers" link.
- "See the answers" also lists the other businesses each answer named and the websites it used.

---

### B-88 Opportunities grouped by where you fix them (Phase A4)
- [ ] Done (built, not committed)

Phase 11 · S · Depends on: B-52 · Blocked by Jordan: no · MVP_SPEC 7.3, 8.1 · Branch: `task/B-88-fixes-by-place` → `mvp`

**Build**
- `opportunities/where.ts`: each saved fix goes under Your website, Your Google listing or Other places AI looks, from its category, its "Copy for Claude" prompt and its words. Nothing is rewritten or stored. Tabs, order, status and copy buttons unchanged.

**What the user sees**
- Fixes in three groups, the group with the most important fix first, and "About Bean House" on fixes that name a competitor.

---

### B-89 Overview: why the leading competitor is ahead (Phase A5)
- [ ] Done (built, not committed)

Phase 11 · S · Depends on: B-86 · Blocked by Jordan: no · MVP_SPEC 8.1 · Branch: `task/B-89-overview-why` → `mvp`

**What the user sees**
- "Why Bean House is ahead of you" with the question they win most and the 2 clearest likely reasons, or "Why you're ahead of ..." when you lead everyone. "See why" opens the Competitors panel. No Google call on the Overview.

---

### B-90 The likely reason in the report, PDF and weekly email (Phase A6)
- [ ] Done (built, not committed)

Phase 11 · S · Depends on: B-85, B-89 · Blocked by Jordan: no · MVP_SPEC 8.2, 9, D-73 · Branch: `task/B-90-shared-summary` → `mvp`

**Build**
- `competitors/why/service.ts` `whySentence`: one line from the Overview card's data (saved answers only), used by the report summary (`reports/service.ts`, so the share page and its PDF) and the weekly email (`notifications`). `loadPicked` gives the report and the email the same data the Overview uses, without a signed-in user and without a Google call.

**What the user sees**
- The report summary and each business in the weekly email say, for example, "A likely reason Bean House is ahead of you: AI used yelp.com in 9 answers that named Bean House and not you." No Google numbers in either.

---

### B-91 Check competitor websites, on request (Phase B)
- [ ] Done (built in the working tree on `mvp-bugs-fixes`; migration 071 applied to local dev and the test database, not live)

Phase 11 · L · Depends on: B-86 · Blocked by Jordan: no (D-85, MVP_SPEC 7.1 updated) · Branch: `task/B-91-competitor-sites` → `mvp`

As built: no job queue. One check runs inside the request, like auto-fill at setup (Firecrawl about 25 seconds plus the AI), so the scan worker is unchanged. The address must be the typed one or a cited one (`allowedDomain`); test accounts read only fixtures; rate limit `site_check` 20 an hour per user. Services are kept only when a page says them (`evidenceFor`).

Step 1 (2026-10-26): the same read also keeps, per site, what the pages show AI tools (`onboarding/competitor-site/signals.ts`: business details in the page code, FAQ, reviews, opening hours, a form, word count) and which AI crawlers robots.txt turns away (`robots.ts`). The business's own site is read the same way in the same check, so both sides are compared on the same checks (`standing/site-signals.ts`, the "Them / You" table). No AI, no extra cost apart from one robots.txt fetch.

Step 2 (2026-10-26): claims questions often ask about (24/7, emergency, free estimates, prices, years in business and others, `src/lib/site-claims.ts`), each with its page and quote, plus the site's words. For each question they win, the reason says what the question asks that their site says and yours doesn't. Saved data is version 2; version 1 rows are read again.

**Build**
1. A card on Opportunities and a button in the "See why" panel. The website is the one the user typed or one matched from AI citations; nothing from Google is saved (D-73).
2. One migration (one session only, backup first, additive, RLS): `website_facts` by domain, shared and reused for 30 days, and a small `site_check_jobs` queue read by the existing background worker.
3. Reuses `readSiteFacts` with the same prompt, so no prompt change. Rate limit, plan cap, test agencies use fixtures, cost logged to `usage_events`.
4. New facts compared in code: "Their website lists tire sales, yours doesn't mention tires", with page and quote.

---

### B-92 Give the new facts to the explanation (Phase C)
- [ ] Done

Phase 11 · M · Depends on: B-91, B-51 eval labelled · Blocked by Jordan: no · MVP_SPEC 7.2, 25 · Branch: `task/B-92-explain-v3` → `mvp`

- Changes the "why competitors win" prompt, so its eval must have people-labelled cases first (MVP_SPEC 25).

Read once (2026-10-26): a site is read once and kept; the panel and the Opportunities card both show "checked" with no
second read anywhere. The row is claimed before reading (insert only), so two clicks at once never read twice; a failed
read frees the claim; a claim left more than 10 minutes by a check that never finished can be taken over.

Where the gap comes from (2026-10-26): at the top of the See why panel, who leads in each place AI looks (review sites,
AI quoting each website, Google listing, the websites), the score's own answers split by where AI looked (answers,
named them, named you), and the pages of their site AI used (`standing/gap.ts`, `GapBreakdown.tsx`).

---

### B-93 Comparison page: "Bean House vs you"
- [ ] Done (built in the working tree on `mvp-bugs-fixes`, not committed yet)

Phase 11 · M · Depends on: B-86, B-91 · Blocked by Jordan: no · MVP_SPEC 8.1, D-73, D-85 · Branch: `task/B-93-compare-page` → `mvp`

**Why:** the See why panel had grown to about 3 screens on a laptop and 7 on a phone, with each fact shown 3 or 4 times.

**Build**
1. `/competitors/[id]`: a summary (the two bars and who leads in each place AI looks), then tabs with their own address (`?tab=`): Why they're ahead (every reason, grouped by where you fix it, and where you lead), AI answers (answers by where AI looked, questions each of you wins, by AI, pages used), Websites (the only "Check their website" button; services with quotes, a service picked compares it with yours; what each site says; what each shows AI tools), Google, Fixes.
2. The panel keeps the bars, who leads where, the top 3 reasons, the website status and "Open full comparison".
3. Links: the Overview card, "About ..." on fixes, tracked competitors on Questions, and the Opportunities website list (status only, no button) all open the page.
4. Quotes: the best-reading sentence is kept over a menu label or a page title, and quotes are tidied for display.

**What the user sees**
- One page per competitor with every fact once, a short panel for the glance, and the website check in one place.
