# Migrations

Every schema change is a new SQL file in this folder, applied by the Supabase CLI in filename order (OPS-02, D-43).

## Rules

1. One new file per change: `supabase migration new <name>`. Never edit a file that has been applied anywhere.
2. Additive only until the MVP is live (D-43): add tables, columns, indexes, policies. No drops or renames.
3. Every `create table` enables row level security in the same file. CI runs `npm run check:rls` and fails otherwise.
4. Only one session at a time adds files here (B-18).
5. Apply to the dev project (`customers-dev`) while building. The live project gets migrations only at go-live, with the user's approval.
6. Back up before every `supabase db push`: `supabase db dump --linked -f backup-<date>.sql` (schema) and `supabase db dump --linked --data-only -f backup-<date>-data.sql`. Keep backups out of git.
7. After every migration run `npm run db:types` and commit `src/types/database.types.ts`.

## Commands

| Task | Command |
|---|---|
| Rebuild the local database from these files | `npm test`, which does it first (or `source scripts/test-db-env.sh && supabase db reset --local` for this worktree's own stack) |
| Link the CLI to a project | `supabase link --project-ref <ref>` (dev `whjdcjoojylajtyjywhx`, live `wsxusvapciexemfvtadm`) |
| Check local matches the linked project | `npm run db:drift` |
| Apply new files to the linked project | back up, then `supabase db push` |

`npm run db:drift` compares tables, columns, constraints, indexes, policies, grants, functions, triggers, extensions and storage buckets. It ignores `pg_net`, which the local image enables by default.

## Baseline (B-10, 2026-09-26)

Files `001` to `019` were applied to live by hand, so live has no `supabase_migrations` history table. What was found:

- Two files shared `013`. Live applied `013_agent_readiness` first (its table has oid 17829) and `013_contact_source_fields` last (its indexes have oids 18011 and 18012, after `014`). The second was renamed to `019_contact_source_fields.sql`.
- On live, `019_contact_source_fields` ran before `018`, `015_resilient_profile_trigger` was never applied, two length checks on `contact_submissions` were added by hand, and the `STORAGE` and `business-logos` buckets were made in the dashboard.
- `020_live_baseline.sql` restores exactly that state, pulled from live with `supabase db dump`. On live every statement in it is a no-op.

Result: `supabase db reset --local` then `npm run db:drift` against live reports no drift.

Before the first `supabase db push` to live, record the existing files as applied so the CLI does not rerun them (after a backup, with the user's approval):

```
supabase migration repair --linked --status applied 001 002 003 004 005 006 007 008 009 010 011 012 013 014 015 016 017 018 019 020
```

`015` is marked applied even though live never ran it; `020` puts live's own trigger functions back, so the result is the same.

## Scan schedules (B-28, MVP_SPEC 6.2)

Migration `029` enables `pg_cron` and `pg_net` and adds these jobs (UTC). Check them with `select jobname, schedule, command from cron.job;` or, from the app, `rpc('cron_job_status')` (service role only, `030`).

| Job | When | Runs |
|---|---|---|
| `enqueue-due-scans` | 02:00 daily | `enqueue_due_scans(false)`: a queued job for each business due today whose agency has credits and is not past due, canceled, suspended or deleted |
| `call-scan-worker` | every minute | `call_scan_worker()`: pg_net POST to the worker with `x-worker-secret`, only when a job is waiting |
| `reset-stuck-jobs` | every 10 minutes | `reset_stuck_jobs()` (B-27) |
| `expire-grants` | 01:00 daily | `expire_grants()` (B-13) |
| `purge-cron-history` | 03:30 daily | deletes pg_cron run history older than 14 days |
| `check-system-alerts` | every 15 minutes | `run_system_alerts()` (B-69, `037`): runs `check_system_alerts()`, then POSTs to the app's alerts URL, which adds the daily AI cost check and emails the admins |
| `email-low-credits` | every 30 minutes | `run_email_job('low_credits')` (B-62, `038`): POSTs to the app's email jobs URL, which emails agencies whose credits are 80% used, at 0 or below 0 (`low_credit_agencies()`), once per level per period |
| `purge-deleted-accounts` | 03:45 daily | `run_account_purge()` (B-77, `042`): `purge_deleted_accounts()` removes deleted accounts and businesses past their `purge_after` (the app sets it from `DELETION_WAIT_DAYS`, default 30), anonymising `credit_transactions` and `email_log`; then POSTs job `account_purged` to the email jobs URL, which removes logo files and sends the last email |
| `purge-rate-limit-hits` | hourly at :15 | deletes `rate_limit_hits` rows older than a day (SEC-07, `039`) |
| `email-weekly-report` | Mondays, every 15 minutes from 13:00 to 17:45 UTC | `run_email_job('weekly_report')` (B-62, `038`): each call sends for a few seconds; later calls pick up agencies not emailed yet |

### Worker URL and secret (Vault, set by hand per project)

The URL and secret are never in a migration. Until they are set, `call_scan_worker()` sends nothing. Run once in the SQL editor of each project, with the same secret as that host's `WORKER_SECRET` env var:

```sql
select vault.create_secret('https://<host>/.netlify/functions/scan-worker-background', 'scan_worker_url');
select vault.create_secret('<WORKER_SECRET value>', 'scan_worker_secret');
```

Alert emails (B-69) need the app's alerts endpoint; it uses the same secret. Without it alerts are still stored and shown on the admin Overview, but no email goes out and the daily AI cost check does not run:

```sql
select vault.create_secret('https://<host>/api/alerts/check', 'system_alerts_url');
```

Scheduled emails (B-62) need the app's email jobs endpoint, with the same secret. Without it no low credit or weekly report email goes out:

```sql
select vault.create_secret('https://<host>/api/email/jobs', 'email_jobs_url');
```

To change one later: `select vault.update_secret((select id from vault.secrets where name = 'scan_worker_url'), '<new value>');`

Check the calls: `select id, status_code, left(content, 200), created from net._http_response order by created desc limit 5;`

### Before go-live

- The worker URL points at the `mvp` staging deploy (`https://mvp--<netlify-site>.netlify.app/.netlify/functions/scan-worker-background`).
- The daily enqueue passes `false`, so only `is_test` agencies are scanned. Real customers are never scanned or charged by unreleased code.

### Go-live switch (B-80)

1. Point the URL at production: `select vault.update_secret((select id from vault.secrets where name = 'scan_worker_url'), 'https://<production domain>/.netlify/functions/scan-worker-background');`
2. Let the daily enqueue include real agencies: `select cron.schedule('enqueue-due-scans', '0 2 * * *', 'select public.enqueue_due_scans(true)');`
3. Check: `select command from cron.job where jobname = 'enqueue-due-scans';` shows `(true)`.

## Pending for customers-dev and live

Applied to the local stack only (customers-dev is unreachable, F-24; live is untouched until go-live). Apply in order, after a backup, then set the Vault secrets above:

- `029_scan_schedules.sql`
- `030_cron_job_status.sql`
- `031_scan_frequency_next_scan.sql`
- `032_visibility_checks_30d.sql`
- `033_retry_scan_job.sql`
- `034_topup_packs.sql` (B-40; then run the Stripe catalog sync for that project, see `src/modules/billing/README.md`)
- `035_email_log.sql` (B-61; then run `npm run db:types` against that project and check the diff is empty)
- `037_system_alerts.sql` (B-69; then set the `system_alerts_url` Vault secret above and `ALERT_DAILY_COST_USD` on the host)
- `038_email_jobs.sql` (B-62; then set the `email_jobs_url` Vault secret above)
- `039_rate_limit_hits.sql` (SEC-07; shared per-IP counts for the contact form and the public compare check)
