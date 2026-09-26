# Phase 2: Foundation

Goal: the new database, credit system, entitlements and moved data that every feature builds on. [Back to index](./README.md)

---

### B-10 Migration workflow and baseline
- [ ] Done

Phase 2 · M · Depends on: B-06 · Blocked by Jordan: no · MVP_ROADMAP OPS-02, D-43 · Branch: `task/B-10-migration-workflow-and-baseline` → `main`

**Build**
1. Link the Supabase CLI to the project. Pull the current live schema as a baseline migration so local, CI and live match.
2. Fix the duplicate `013_*` numbering: check which order live applied them in, rename one to the next free number, record this in `supabase/migrations/README.md`.
3. Document the workflow in that README: new file per change, never edit an applied migration, additive only until MVP launch, back up before `supabase db push`, run `npm run db:types` after every migration.
4. Add a CI check: every `create table` in a new migration has a matching `enable row level security`.

**What the user sees**
- Nothing visible.

**Engineering checks**
- `supabase db reset` locally reproduces the live schema; diff is empty.
- The RLS check fails on a deliberately bad migration.

---

### B-11 Core tables
- [ ] Done

Phase 2 · M · Depends on: B-10 · Blocked by Jordan: no · MVP_SPEC 13, D-20, D-56, D-58, D-61, D-62 · Branch: `task/B-11-core-tables` → `main`

**Build**
One migration adding (nothing existing changed or dropped):
1. `agencies` (with `status` including `deleted`, `is_test`, `trial_ends_at`, `current_period_end`, Stripe IDs, `logo_url`).
2. `plans` seeded with `starter` and `pro` from MVP_SPEC 4.1 (prices marked pending Jordan's confirmation, D-21), plus `enterprise` inactive.
3. `business_subscriptions`.
4. New `businesses` columns: `agency_id`, `scan_frequency`, `models`, `next_scan_at`, `onboarding_step`, `has_website`, `phone`, `services`, `aliases`, `places_id`.
5. `places_id` on the competitors table.
6. `question_library`, `scan_jobs` (unique partial index: one `queued` or `running` job per business), `ai_answer_cache` (unique `cache_key`), `report_shares`, `system_alerts`, `admin_audit_log`, `business_site_facts`.
7. RLS: agencies read only their own rows through `agencies.owner_user_id = auth.uid()`; jobs, cache, alerts and audit log are service role only.

**What the user sees**
- Nothing visible.

**Engineering checks**
- RLS tests: a test user can read its own agency and businesses and cannot read another agency's (Vitest against local Supabase).
- Inserting a second queued job for the same business fails.

---

### B-12 Credit tables
- [ ] Done

Phase 2 · S · Depends on: B-11 · Blocked by Jordan: no · MVP_SPEC 4.2, 13, D-58 · Branch: `task/B-12-credit-tables` → `main`

**Build**
1. Migration: `credit_grants`, `credit_transactions` (unique `(source_type, source_id)`), `credit_holds` (unique `scan_job_id`).
2. Indexes for "unexpired grants by agency ordered by `expires_at`".
3. RLS: agencies can read their own grants and transactions; only the service role writes.
4. A read-only view `agency_credit_balance` (sum of remaining on unexpired grants minus open holds, plus plan and top-up split for the Usage page).

**What the user sees**
- Nothing visible.

**Engineering checks**
- Writing to a credit table with a normal user token fails.

---

### B-13 Credit SQL functions
- [ ] Done

Phase 2 · M · Depends on: B-12 · Blocked by Jordan: no · MVP_SPEC 4.2, D-53, D-54, D-55 · Branch: `task/B-13-credit-sql-functions` → `main`

**Build**
1. Migration with six `security definer` functions callable only by the service role:
   - `hold_credits(agency_id, amount, scan_job_id)`: locks the agency row (`select ... for update`), fails if the balance is 0 or less, creates the hold, returns `hold_id`.
   - `capture_credit(hold_id, check_id)`: takes 1 credit from the soonest-expiring grant, writes a transaction with key `('check', check_id)`.
   - `release_hold(hold_id)`: returns uncaptured credits, closes the hold.
   - `grant_credits(agency_id, source, source_id, amount, expires_at)`: settles any negative balance first.
   - `expire_grants()`: zeroes expired grants.
   - `admin_adjust_credits(agency_id, delta, admin_user_id, note)`.
2. `src/modules/credits/dal.ts` (server-only): typed wrappers. `src/modules/credits/service.ts`: `getBalance()`, `estimateMonthlyCredits(questions, models, frequency)` (MVP_SPEC 4.3).

**What the user sees** (checked in the app once the scan engine and usage widget exist; until then through the admin credit page or a test script)
- A scan of 12 questions on 3 models lowers the balance by exactly 36.
- When one AI provider fails during a scan, only the successful checks are charged, and the scan still shows a result.
- Double-clicking "Run scan" runs one scan and charges once.
- An agency with 5 credits runs a scan: it finishes, the balance shows -31 with an "out of credits" banner, and the next scan is blocked.
- Buying a 500-credit top-up then shows 469 (the negative amount is paid off first).

**Engineering checks**
- Vitest against local Supabase: hold, capture and release; failed check not charged; two concurrent holds with no double spend; overdraft then settle; duplicate capture charged once; expired grants skipped.

---

### B-14 Move existing data
- [ ] Done

Phase 2 · M · Depends on: B-13 · Blocked by Jordan: beta-user treatment (B-81) only affects the trial grant · MVP_SPEC 19, D-69 · Branch: `task/B-14-move-existing-data` → `mvp`

**Build**
1. Keep the audit test account `ek181773+cdaudit0923@gmail.com` and its Brandastic business (created 2026-09-23); mark its agency `is_test` after the backfill so it never spends real credits.
2. Backup and row counts (B-02 procedure).
3. Idempotent backfill migration (MVP_SPEC 19 step 2): an agency per profile that owns businesses or billing accounts; businesses linked with weekly frequency, all three models, `has_website`, `next_scan_at`; existing tracked prompts marked `source = legacy`; existing visibility results mapped to checks; Stripe data not carried over.
4. Verification script `scripts/verify-migration.ts`: counts match, every business has an agency, RLS isolation holds.
5. Rehearse on a copy of the live database first (restore the backup into a local Supabase), then run on live.

**What the user sees**
- Existing users log in and see their businesses and past scan history, now under their agency name.

**Engineering checks**
- Verification script output pasted in the PR (before and after counts).
- Running the backfill twice changes nothing the second time.

---

### B-15 Auth helpers and Data Access Layer scaffolding
- [ ] Done

Phase 2 · M · Depends on: B-11 · Blocked by Jordan: no · MVP_SPEC 18.1 rules 1, 2, 8, D-59, D-79 · Branch: `task/B-15-auth-helpers-and-data-access` → `mvp`

**Build**
1. `src/modules/auth/dal.ts`: `requireUser()` (uses `getUser()`, redirects or throws 401), `requireAgency()` (the user's agency, blocks `suspended` and `deleted`), `requireAdmin()` (`ADMIN_EMAILS` from env or `profiles.account_type = 'admin'`).
2. `src/lib/supabase/`: typed `server` (user-scoped), `service` (service role, only importable from `dal.ts` files), `browser` clients.
3. Keep `src/proxy.ts` to cookie-based redirects only (logged-out users to `/login`, logged-in users away from `/login`).
4. A template module `src/modules/_template/` showing `dal.ts`, `actions.ts`, `service.ts`, `schema.ts`, `index.ts` and a test, for developers to copy.

**What the user sees**
- Logged-out visitors opening the dashboard go to the login page and come back after logging in.
- A suspended agency sees a clear "Your account is paused, contact support" page.

**Engineering checks**
- Calling a protected action without a session returns 401 (test).
- `scripts/check-auth-calls.ts` passes.

---

### B-16 Entitlements module
- [ ] Done

Phase 2 · M · Depends on: B-13, B-15 · Blocked by Jordan: no · MVP_SPEC 4, D-16, D-25, D-60 · Branch: `task/B-16-entitlements-module` → `mvp`

**Build**
1. `src/modules/entitlements/service.ts` with one function per question: `canAddBusiness(agency)` (trial: max 2), `canStartScan(agency, business)` (balance above 0, status `trialing` or `active`, no job already queued), `maxQuestions(business)`, `maxCompetitors(business)` (from the `plans` table), `canSpendTopUps(agency)` (active plan or trial).
2. Each returns `{ allowed: boolean, reason: string }` with a plain-language reason for the UI.
3. Unit tests for every rule.
4. Delete the old unused `src/lib/billing/entitlements.ts` (it had the `ba.status` bug).

**What the user sees**
- A trial agency trying to add a third business sees "Your trial includes 2 businesses. Upgrade to add more."
- An agency with 0 credits pressing "Run scan" sees "You're out of credits. Buy a top-up or upgrade."

**Engineering checks**
- Unit tests cover every rule and reason.

---

### B-17 Admin access cleanup
- [ ] Done

Phase 2 · S · Depends on: B-15 · Blocked by Jordan: no · D-35, MVP_ROADMAP SEC-09 · Branch: `task/B-17-admin-access-cleanup` → `mvp`

**Build**
1. Every `/internal/admin` page and `/api/internal/admin` route uses `requireAdmin()`.
2. Replace the hardcoded `OWNER_ADMIN_EMAILS` in `src/app/dashboard/page.tsx` with `requireAdmin` logic.
3. Delete the `exec_sql` function from the database (new migration) now that `apply-migration` is gone (B-03).

**What the user sees**
- A normal user opening `/internal/admin` is sent back to their dashboard. The admin link appears only for admins.

**Engineering checks**
- Test: non-admin gets redirected; admin gets in.
- `select proname from pg_proc where proname = 'exec_sql'` returns nothing.

---

## Phase 2 demo checklist

1. Log in with an existing account: your businesses and past results are still there.
2. Log in as a normal user and try `/internal/admin`: you are sent back to the dashboard.
3. Ask the developer to show, in the admin credit tools or a test script, a scan-sized hold of 36 credits being charged, and a failed check not being charged.
4. On a trial test account, try to add a third business: the friendly limit message appears.
