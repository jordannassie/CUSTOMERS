# Phase 8: Admin

Goal: a small, useful admin panel to run the business: agencies, credits, scans, costs and alerts. [Back to index](./README.md)

All admin pages use `requireAdmin()` (B-17). Leads, Feature Requests and LinkedIn Studio stay as they are, outside the main menu (D-07, D-35).

---

### B-64 Admin shell
- [ ] Done

Phase 8 · S · Depends on: B-17, B-09 · Blocked by Jordan: no · MVP_SPEC 9.1, D-35 · Branch: `task/B-64-admin-shell` → `mvp`

**Build**
1. `src/app/(admin)/admin/layout.tsx` with six items: Overview, Agencies, Businesses, Scans, Usage & Cost, Settings; small links to Leads, Feature Requests and LinkedIn Studio.
2. Replace the old 12-item `AdminNav`.
3. `admin_audit_log` helper `logAdminAction(action, target, details)` used by every admin mutation.

**What the user sees** (admin)
- A short, clear admin menu.

**Engineering checks**
- Non-admins are redirected (test).

---

### B-65 Overview and Agencies
- [ ] Done

Phase 8 · L · Depends on: B-64, B-13, B-42 · Blocked by Jordan: no · MVP_SPEC 9.1 · Branch: `task/B-65-overview-and-agencies` → `mvp`

**Build**
1. Overview: agencies, active trials, paying businesses, revenue this month (from Stripe), credits used, real AI cost vs revenue, recent signups, recent failed scans, open alerts (B-69).
2. Agencies list: owner email, businesses, plan mix, credit balance (plan and top-up), trial end, Stripe status, `is_test` flag.
3. Agency detail actions, each with a required reason and logged: add or remove credits (`admin_adjust_credits`), extend trial (Stripe), suspend and unsuspend, restore a deleted account within 30 days, mark as test.
4. Merge the old Accounts, Users and Billing admin pages into this one and delete them.

**What the user sees** (admin)
- At a glance: how many customers, how much they pay, how much the AI costs.
- Can fix a customer's problem (credits, trial) in a few clicks, with a record of who did what.

**Engineering checks**
- Tests: every action writes an audit log row; credit adjustment changes the ledger correctly.

---

### B-66 Businesses
- [ ] Done

Phase 8 · M · Depends on: B-64 · Blocked by Jordan: no · MVP_SPEC 9.1 · Branch: `task/B-66-businesses` → `mvp`

**Build**
1. List with agency, plan, frequency, models, last scan status, credits used this month.
2. Detail: profile, competitors, questions, scan history, opportunities, credits used; "Run scan now" (logged).
3. Replace the old businesses admin pages (including the dark-themed detail page).

**What the user sees** (admin)
- Everything about one business on one page, and a button to rescan it for support.

**Engineering checks**
- Playwright on a test business.

---

### B-67 Scans and Usage & Cost
- [ ] Done

Phase 8 · M · Depends on: B-64, B-27 · Blocked by Jordan: no · MVP_SPEC 9.1 · Branch: `task/B-67-scans-and-usage-cost` → `mvp`

**Build**
1. Scans: every job with status, business, models, credits charged, real cost, duration, error; filter by status; "Retry" on failed jobs (logged). Merges the old Scans and Errors pages.
2. Usage & Cost: credits used and real AI cost by day, by model and by agency; cache hit rate; cost per check per model compared with the credit price (margin check).

**What the user sees** (admin)
- Failed scans can be retried in one click.
- A clear view of whether each AI model is still profitable.

**Engineering checks**
- Numbers match `usage_events` and `credit_transactions` for a test period.

---

### B-68 Settings (system status)
- [ ] Done

Phase 8 · S · Depends on: B-64 · Blocked by Jordan: no · MVP_SPEC 9.1 · Branch: `task/B-68-settings-system-status` → `mvp`

**Build**
1. Status of each service key and connection: OpenAI, Anthropic, Perplexity, Google Places, Firecrawl, Browserless, Stripe (sandbox or live), Resend, worker last run, pg_cron jobs last run.
2. Remove DataForSEO, Gemini and the old pricing viewer.

**What the user sees** (admin)
- A single page showing whether every service is connected and working.

**Engineering checks**
- Each status reads live (a broken key shows red in a test).

---

### B-69 Alerts
- [ ] Done

Phase 8 · M · Depends on: B-27, B-42, B-61 · Blocked by Jordan: no · MVP_SPEC 22, D-76 · Branch: `task/B-69-alerts` → `mvp`

**Build**
1. pg_cron every 15 minutes runs `check_system_alerts()`: failed scans over 20% in the last hour, stuck jobs, failed Stripe webhooks, a provider error spike, negative balances, daily AI cost above `ALERT_DAILY_COST_USD`.
2. New alerts go to `system_alerts`; an email goes to the admins at most once per hour per alert type.
3. Overview shows open alerts with "Resolve".

**What the user sees** (admin)
- An email when something goes wrong, before customers notice.

**Engineering checks**
- Tests: each alert condition fires once and respects the hourly limit.

---

## Phase 8 demo checklist

1. Log in as an admin: six menu items.
2. Overview: customers, revenue, AI cost and alerts on one screen.
3. Open a test agency: add 50 credits with a reason; the balance changes and the action appears in the log.
4. Extend a trial by 3 days; suspend and unsuspend the agency.
5. Scans: retry a failed test scan.
6. Usage & Cost: see cost per model and margin.
7. The developer forces a failure spike: the alert email arrives once.
