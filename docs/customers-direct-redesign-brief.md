# Customers.Direct dashboard redesign: brief for Claude Code

Visual reference (clickable mockup, 7 screens): https://claude.ai/artifact/Hza8kAncU3PXjxhSVpkVd8
Product direction: an AEO / AI visibility platform in the general direction of PromptWatch, not a clone.

## Ground rules

- Do not add any Claude or Claude Code attribution to commits or PRs (no Co-Authored-By, no session links, no logo).
- Confirm the base branch before starting (`mvp-bugs-fixes` was being merged into `main`).
- Work in small PRs, one phase each (see "Phases"). Do not mix the data model changes with UI work.
- Reuse the existing design tokens and components. The mockup only shows layout and content, not new styling.
- No invented numbers in production UI. Anything the backend cannot compute yet shows an empty state, not a placeholder figure.

## Step 0: map the codebase before changing anything

Report back with file paths for each of these before writing code:

1. Routes and components for Overview, Competitors, the competitor detail page (`/competitors/[id]`), the competitor side panel, Opportunities, Questions, Sources, Billing.
2. Chart library in use and the components for "Score at each scan" and "Visibility over time".
3. Where the visibility score and the "About the same / You're behind" status are calculated.
4. The current Export PDF and Share implementation.
5. Supabase tables for scans, answers, mentions, citations/sources, competitors, opportunities, website checks, Google details.
6. How opportunities are generated (which job or function, and when it runs).

## Navigation (new sidebar)

```
Overview
VISIBILITY
  Questions        /questions
  Sources          /sources
COMPETE
  Competitors      /competitors
  Compare          /compare            (own top-level page, not a child of Competitors)
IMPROVE
  Actions          /actions            (replaces /opportunities, add a redirect)
  Reports          /reports
ACCOUNT
  Billing
  Settings
```

Compare must be a peer of Competitors in the sidebar with its own active state. Deep link format: `/compare?with=<competitorId>&tab=<summary|questions|sources|website|google>`. Keep `/competitors/[id]` working as a redirect to `/compare?with=<id>`.

## Page specs

### 1. Overview (`/`)

Order, top to bottom:

1. Trial or billing banner (existing).
2. Header: business name, meta line (city, number of questions, AI tools, last scan date), date range control (7 / 30 / 90 days), buttons: View report, Share, Run scan. View report and Share both go to `/reports` (Share opens the share panel there). Remove the current HTML-capture PDF export from this page.
3. KPI strip: visibility score with change vs previous period, share of AI picks with rank, answers that named you (x of y), times your own website was cited.
4. Row: "Visibility at each scan" chart (2/3 width) and "Score by AI tool" (1/3 width, add one line of context under each bar, for example "Pizza Hut 75, Domino's 15").
5. Row: "Where you stand" (top 4 businesses with score bar and status pill, links to /competitors) and "Top actions" (top 3 from Actions, each with its "where to apply" line, links to /actions).
6. Row: "Questions that moved" (up and down since the previous scan) and "Where AI gets its answers" (top 5 domains with a status pill: You missing / Partly / Never cited).

### 2. Questions (`/questions`)

1. Header with Export CSV and Add question.
2. KPI strip: active questions x of plan limit (with paused count), questions that named you at least once, questions that never named you, estimated credits per month.
3. Add question card: input, live credit estimate (existing logic), and a row of suggested questions. Suggestions are a later phase: questions where competitors are named and the business is not. Hide the row until the backend supports it.
4. Questions list:
   - Filters: All, Named you, Never named, Getting worse. Topic tags (Delivery, Price, Quality, Pickup) can start as a manual tag on each question.
   - Each row: question text, topic tag, top pick (business named most for this question), sites that skipped you, one column per AI tool showing the last N checks as small filled or empty squares plus "x of N", overall named %, trend (Up / Same / Down vs previous scan).
   - Click a row to expand it inline (replace the current modal). Expanded view has AI tool tabs that show "named you / not named" in the tab itself, the latest answer as a numbered list of businesses with a short snippet, the business highlighted when it is you, "Websites it used" as chips linking to /sources, a "Why you were skipped" box linking to the matching Action, "Businesses named, all tools", and Pause / Edit / Check now.
   - Answer rendering: parse the markdown, and convert raw URLs (for example the long google.com/maps links in the current modal) into source chips. Never print raw URLs in the answer body. Keep "Show full answer text" for the untouched original.
5. Footer: "Showing x of y", Show paused.

### 3. Sources (`/sources`)

1. Header with an AI tool filter (All, ChatGPT, Claude, Perplexity) that filters every number on the page.
2. Alert banner when the business's own site was cited 0 times.
3. KPI strip: websites AI used, top source, top 10 sources that mention you, your website cited count (with competitor sites count).
4. Row: "Get listed here first" (top 4 domains ranked by answers that cited the domain and did not name you, excluding competitor sites, each with a one-line fix, impact and Add to Actions) and "Kinds of websites" (existing three categories with bars).
5. Table "All websites AI used" with filters All / Skips you / Mentions you / Competitor sites. Columns: website, kind, how often AI used it (bar + x of total), used by (one dot per AI tool), mentions you (No / Sometimes / Their own site), businesses it names most, and a CTA (Get listed / Improve / Compare).
6. Kind refinement: keep the three top categories, but give each domain a sub-kind: delivery app, competitor site, food guide, social, reviews, directory, travel guide. A domain is a "competitor site" when it matches the website of a tracked or AI-named competitor.

### 4. Competitors (`/competitors`), overview only

Remove the right-hand side panel completely.

1. Header with "Manage list (x of y)" and "Compare side by side" (goes to /compare).
2. KPI strip: your rank, leader, gap to leader (with change), next one to pass.
3. Visibility over time: per-scan series for you and the top 3 competitors (see "Chart fix").
4. Leaderboard table: rank, business name with a one-line "Top reason" under it (the highest-ranked reason from the comparison engine), score, sparkline of the last 10 scans, change, ChatGPT / Claude / Perplexity values, status pill, and a Compare button.
5. Keep as they are (the client likes these): Your share of AI picks, By AI model, Side by side on Google.
6. "Also recommended by AI" as a card grid with Track buttons.

### 5. Compare (`/compare`)

This is where all facts, reasons and comparisons live.

1. Header: title "Compare", a short subtitle, Scan their website, Add to report.
2. Picker card: chips for every tracked competitor with their score, plus "+ Any business AI named" (lets the user compare against an untracked business from the AI answers). Below the chips, inside the same card: "You vs {name}", status pill and a one-line subtitle.
3. Head-to-head scorecard: both scores, answers counts, gap with the margin of error, and paired bars per AI tool.
4. Tabs:
   - **Why they are ahead or behind** (default). One card per reason, sorted by evidence size. Left side: category tag, "Based on N answers", title, the fact in one sentence, "See the answers" (links to /questions filtered to those answers). Right side, "WHAT TO DO" box: the fix, where to apply it, impact, and an "Add to Actions" button that switches to "In Actions · {status}" once added. Below: "Where you are ahead" cards. When the competitor is behind you, show an empty-state reason and only the ahead cards.
   - **Questions**: each question with "x of 3" for them and for you, and a result pill (They win / Tie / You win).
   - **Where AI looked**: domains with answers that used them, named them, named you, result pill.
   - **Website**: if their site was scanned, show the signal bars and the "What each website shows AI" checklist. If not, an empty state with "Scan their website" and the credit cost. While scanning, a progress state.
   - **Google**: Google details side by side, with Retry when the fetch fails.

The side panel's "Top likely reasons" content moves here as the reason cards above. The "Open the saved fix for this" link becomes the "In Actions · {status}" state of the button.

### 6. Actions (`/actions`), replaces Opportunities

1. Kanban board with columns Suggested, To do, In progress, Done, Dismissed, plus a List view toggle.
2. Filters: impact, where to fix (Website, Google listing, Review sites, Social, Content), assignee.
3. Card: "where to apply" label, impact pill, title, an evidence box (the fact that created it), optional "Copy prompt for Claude" for website fixes, date or assignee, Accept / Dismiss on Suggested cards.
4. No competitor sections on this page. Competitor-derived fixes only arrive through "Add to Actions" on /compare and then look like any other action (the evidence box can mention the competitor).
5. Done cards show the completion date and "we will measure the effect over the next 30 days".

### 7. Reports (`/reports`)

1. Header: Schedule, Share link, Download PDF.
2. Share panel (toggle): read-only public link, Copy, Turn off. The link shows the report only, never the dashboard.
3. Left column: saved reports (a live monthly report plus frozen snapshots after scans), section toggles, branding (agency logo upload).
4. Right column: the report rendered as a document, in this fixed order:
   1. Summary: headline sentence, 3 facts (score, rank, website citations), a short plain-language paragraph.
   2. Score by AI tool.
   3. Competitors: table with score, share of picks, and main reason.
   4. Questions: named count per question and trend.
   5. Where AI looks: top domains and whether they named you.
   6. Action plan: numbered fixes with impact, where to apply, and why.
   7. How we measure.
5. Public route `/r/[token]` renders the same document read-only.

## Chart fix (flat lines)

Likely cause: the charts plot the rolling 30-day score at every scan, and that number barely moves by design. There were also only two scans in the data.

1. Main series: that scan's own hit rate (answers that named the business / answers on that scan), per entity, optionally per model.
2. Dashed reference line: the rolling 30-day score.
3. Auto-scale the Y axis to the data (for example 0 to 50), not a fixed 0 to 100.
4. Fix the Y axis labels on the compare chart, which currently all read "0".
5. Sparklines in the leaderboard normalize each series to its own min and max so the shape is visible.

## Status logic fix

Domino's at 28 vs the business at 15 shows "About the same", but the margin band is about ±11 (4 to 26). Use one shared function:

```ts
type Status = 'behind' | 'same' | 'ahead';

export function compareStatus(you: number, them: number, margin: number): Status {
  const diff = them - you;
  if (diff > margin) return 'behind';
  if (-diff > margin) return 'ahead';
  return 'same';
}
```

Use it everywhere a status pill appears (Overview, Competitors, Compare, Reports).

## Data model changes (Supabase)

Check existing tables first and extend them where possible. Names below are suggestions.

### `actions` (replaces or extends `opportunities`)

```sql
create type action_status as enum ('suggested','todo','in_progress','done','dismissed');
create type action_impact as enum ('high','medium','low');

create table actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  description text,
  category text not null,          -- website | google_listing | review_sites | social | content
  where_to_apply text not null,    -- 'Google Business Profile', 'cheezious.com home and location pages'
  impact action_impact not null,
  status action_status not null default 'suggested',
  evidence jsonb not null default '{}', -- { fact, answers_count, domain?, model?, question_ids?, competitor_id? }
  claude_prompt text,
  source text not null,            -- scan | comparison | manual
  dedupe_key text not null,        -- same fix is never created twice
  assignee_id uuid,
  due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (business_id, dedupe_key)
);
```

Migrate existing opportunities into this table with status `suggested`. Add RLS matching the existing business-membership policies.

### `comparison_reasons` (or compute on read and cache)

One row per (business, competitor, reason). Fields: category, title, fact, answers_count, what_to_do, where_to_apply, impact, direction (`they_lead` or `you_lead`), dedupe_key (shared with actions so "Add to Actions" can show the linked status).

Generation rules, all from the last 30 days of answers:

1. For each domain: count answers that cited the domain, named the competitor and did not name the business. Reason when the count is 2 or more.
2. For each AI tool: the competitor's named share minus the business's. Reason when the gap exceeds the margin.
3. Review sites grouped (tripadvisor, google, facebook): named counts for both.
4. Website signals: differences from the website check (business details for AI, FAQ, hours, reviews, contact form, readable words).
5. Rank by answers_count, then impact. Mirror rules produce the "Where you are ahead" items.

### `scan_metrics`

Per scan, per entity (business or competitor), per model: `named_count`, `total_count`. This powers per-scan charts and sparklines without recomputing from raw answers.

### `reports`

`id, business_id, period_start, period_end, sections jsonb, snapshot jsonb, share_token text unique, share_enabled bool, branding jsonb, created_at`. Snapshots freeze the data at creation time so a shared link does not change underneath a client. The live monthly report is computed on read.

## Report PDF

Stop capturing the Overview HTML. Generate the PDF from the same report data as the Reports page.

Options (check the current docs for each before choosing, versions change):

1. `@react-pdf/renderer`: builds the PDF from React components with no browser, so there is no Chromium bundle on Netlify. Trade-off: it has its own layout primitives, so the report components are written once more for PDF.
2. Headless Chromium printing a print route (`/reports/[id]/print`) with `puppeteer-core` and `@sparticuz/chromium` (or `-min`). Reuses the HTML report, but Netlify functions have bundle size and timeout limits that people regularly hit with Chromium. If you go this way, consider a background function or a hosted browser service.

My recommendation is option 1 unless the codebase already has a working Chromium setup on Netlify.

## Phases (one PR each)

1. Status logic fix and chart fix (small, visible win).
2. Sidebar and routes: add /compare, /actions, /reports; redirects from /opportunities and /competitors/[id].
3. Competitors overview: remove the side panel, new KPI strip and leaderboard with top reason.
4. Compare page with tabs, using existing data first; reason cards from the generation rules.
5. `actions` table, migration from opportunities, Actions board, "Add to Actions" wiring from Compare and Sources.
6. Questions page: list, filters, inline expand, answer rendering cleanup.
7. Sources page: kinds, mentions-you, per-tool filter, "Get listed here first".
8. Overview reorder.
9. Reports: page, snapshots, share link, PDF.

## Acceptance checklist

- [ ] No competitor side panel anywhere.
- [ ] Compare is a top-level nav item with its own active state; switching competitors updates the URL.
- [ ] Every reason card shows a fact with an answer count and a fix with where to apply it.
- [ ] Opportunities URL redirects to Actions; no competitor sections on Actions.
- [ ] Charts show per-scan movement and a dashed 30-day reference; Y axis labels are correct.
- [ ] Status pills use `compareStatus` everywhere.
- [ ] Question answers never show raw URLs.
- [ ] PDF and public link show the same 7 sections in the same order.
- [ ] Empty, loading and error states for: no scans yet, scans paused (trial ended), Google fetch failed, competitor site not scanned.
- [ ] Pages work at phone width (sidebar stacks, wide tables scroll inside their card).
- [ ] RLS covers the new tables; the public report route only exposes snapshot data.

## Open questions for the client

1. Should "Any business AI named" on Compare cost credits (it may need a website scan)?
2. Should Actions support assignees outside the account (agency team members)?
3. Report schedule: email PDF, email link, or both? Weekly or monthly by default?
4. Should own questions (not counted in the score) appear in the report?
