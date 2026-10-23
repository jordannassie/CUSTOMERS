# Production backups

**Status: Proposal, needs Jordan's approval.** Nothing here is turned on yet. Jordan picks option A or B below, and confirms the retention and the restore drill, before launch (B-83, RUNBOOK step 13).

Covers the live Supabase project `wsxusvapciexemfvtadm`: the database (including logins) and the logo files in Storage. Plan: MVP_SPEC 20, D-70. Prices and limits were checked on Supabase's docs on 2026-10-01 (links at the end); check them again before paying.

## What we recommend

1. **Option A** (minimum): the Supabase Pro plan's daily backups, kept 7 days.
2. A manual dump before every migration and before go-live, kept outside Supabase.
3. A weekly copy of the `business-logos` bucket, because database backups do not include files.
4. A restore drill before launch and then every 3 months.

Option B (point-in-time recovery) only if losing up to a day of data is not acceptable.

## What Supabase offers

| Plan | Price | Daily backups | Point-in-time recovery |
|---|---|---|---|
| Free | $0 | None. Supabase says to export with `supabase db dump` yourself | Not available |
| Pro | $25 a month, includes $10 of compute credit (covers Micro) | Last 7 days | Add-on |
| Team | $599 a month | Last 14 days | Add-on |
| Enterprise | Custom | Up to 30 days | Add-on |

Point-in-time recovery (PITR) add-on, on Pro, Team or Enterprise:

| Kept for | Price |
|---|---|
| 7 days | $0.137 an hour, about $100 a month |
| 14 days | $0.274 an hour, about $200 a month |
| 28 days | $0.55 an hour, about $400 a month |

- PITR needs at least the Small compute size: about $15 a month, so about $5 after Pro's $10 compute credit.
- With PITR on, Supabase stops taking daily backups; PITR replaces them. Worst case it loses about 2 minutes of data.
- PITR is not covered by the spend cap, so it is billed even if the cap is on.

**Free plan warning:** a Free project has no backups at all and is paused after a week without use. The repo does not record which plan live is on. Jordan, please check (Supabase dashboard, Organization, Billing).

## The two options

| | Option A: Pro daily backups | Option B: Pro with PITR, 7 days |
|---|---|---|
| Extra cost on top of Pro | $0 | About $105 a month ($100 PITR, about $5 Small compute) |
| Most data we could lose | Up to 1 day (since the last daily backup) | About 2 minutes |
| Go back how far | Any of the last 7 daily backups | Any minute in the last 7 days |

At launch, with few customers and everything also in Stripe, option A is enough. Move to B once losing a day of scans and settings would hurt customers.

## What backups do not cover

| Not in the database backup | How we cover it |
|---|---|
| Files in Storage (logos). The backup has only the file records | Weekly copy, below |
| Auth settings, API keys, Google login setup | Written down in RUNBOOK steps 1 and 8 and the password manager |
| Vault secrets after a restore to a new project | Set again from RUNBOOK step 5 |
| Netlify site and env vars | Netlify keeps old deploys; env names are in RUNBOOK step 1 |
| Payments and invoices | Stripe keeps them; resend missed webhooks after a restore (RUNBOOK step 12) |

## Manual dump before every migration

Before every `supabase db push` to live, and on go-live day (RUNBOOK step 2). **Dev** runs it, with approval for each push to live. The connection string is in the password manager; never paste it anywhere else.

```
supabase db dump --db-url "$LIVE_DB_URL" -f roles-<date>.sql --role-only
supabase db dump --db-url "$LIVE_DB_URL" -f schema-<date>.sql
supabase db dump --db-url "$LIVE_DB_URL" -f data-<date>.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

These are the commands from Supabase's backup and restore guide. The data dump includes logins (the `auth` tables) and the Storage file records, not the files themselves. `supabase db dump --linked` (RUNBOOK step 2) gives the same result once the CLI is linked.

- Write the time and the row counts next to the files: `select relname, n_live_tup from pg_stat_user_tables order by relname;`.
- Store the files encrypted, in the place Jordan picks (for example the password manager's file storage, or a private cloud folder only Jordan and the developer can open). Never in git, a pull request, a chat, or only on a laptop.

## Weekly copy of logos

The `business-logos` bucket holds agency and business logos. The `STORAGE` bucket is from the old app; copy it too until we know it is empty.

1. **Jordan**: in the Supabase dashboard, Storage, S3 configuration, turn on S3 access and create an access key. The key can read and change every bucket and skips row level security, so it goes in the password manager and is used only for this copy.
2. **Dev**, once a week (Monday) and before every migration:

```
aws s3 sync s3://business-logos ./logos-<date>/business-logos \
  --endpoint-url https://wsxusvapciexemfvtadm.storage.supabase.co/storage/v1/s3 --region <project region>
aws s3 sync s3://STORAGE ./logos-<date>/STORAGE \
  --endpoint-url https://wsxusvapciexemfvtadm.storage.supabase.co/storage/v1/s3 --region <project region>
```

3. Store the folder with the database dumps. Logos are small, so this is minutes of work. If this becomes a chore, a scheduled job can do it later.

## How long we keep backups

| What | Kept | Why |
|---|---|---|
| Supabase daily backups or PITR | 7 days (set by the plan) | Fixed by Supabase |
| Manual dumps before a migration | 30 days, and always the last 3 | Enough to undo a bad migration found late |
| Go-live dump | 90 days | Our only copy of the data from before the move |
| Weekly logo copies | Last 4 weeks | Logos rarely change |

Deleted accounts: the Privacy page says data is deleted 30 days after the owner deletes it (B-77). A copy can stay in a backup for up to the times above. **Jordan to decide**: either keep manual dumps no longer than needed and add one line to the Privacy page ("Deleted data can stay in our backups for up to 90 days, then it is gone"), or shorten the go-live dump to 30 days. The Privacy page does not mention backups today.

## Who restores, and how

Restoring the whole database goes back in time and loses everything written since that point, including new signups and credits. So:

- **Jordan** decides whether to restore. Only Jordan, as the Supabase organization owner, approves it.
- **Dev** does the restore and the checks below, and tells Jordan when it is done.
- Before any restore, take a fresh manual dump of the broken state, so nothing is lost for good.

**Which restore to use:**

| Problem | Do this |
|---|---|
| A few rows wrong or deleted (one agency, one table) | Do not restore the whole database. Copy the rows back from the latest manual dump with a SQL script, reviewed first |
| A migration failed or damaged data | If the data is fine, fix it with a new migration (RUNBOOK step 4). If data was damaged, copy the damaged tables back from the dump taken just before that migration |
| The database is badly damaged | Supabase dashboard, Database, Backups: pick a daily backup (option A) or a time (option B). The project is offline while it restores, longer for a bigger database |
| We want to look without touching live | "Restore to a new project" in the Backups page (paid plans). It copies the database and logins but not Storage files, auth settings or API keys, and the new project costs extra while it exists |

**Restore a manual dump** into a new, empty project, never on top of live (from Supabase's guide):

```
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles-<date>.sql --file schema-<date>.sql \
  --command 'SET session_replication_role = replica' \
  --file data-<date>.sql --dbname "$TARGET_DB_URL"
```

Vault secrets are encrypted with the old project's key. In a new project, set the four Vault secrets again (RUNBOOK step 5) instead of copying them.

**After any restore:**

- [ ] Row counts match the numbers written next to the backup.
- [ ] An internal account can log in and sees its businesses and past results.
- [ ] `select jobname, active from cron.job order by jobname;` shows every job active (RUNBOOK step 6), and the four Vault names exist.
- [ ] Logos show; if not, copy them back from the latest weekly copy with `aws s3 sync` in the other direction.
- [ ] In Stripe, resend the webhook events since the backup time (RUNBOOK step 12). Each handler ignores events it has already seen, so nothing is granted twice.
- [ ] Tell affected customers what was lost, if anything.

## Restore drill

A backup we have never restored is a guess. Before launch, and then every 3 months:

1. **Dev**: take the three manual dumps from live (with approval) and copy the logos.
2. **Dev**: create a new, empty Free project named `restore-drill-<date>` (Free is fine; it only needs to exist for an hour).
3. **Dev**: restore the dumps with the `psql` command above. It must finish with no errors.
4. **Dev**: run the row count query on the drill project and compare with the counts written at dump time. Every table must match.
5. **Dev**: upload two logos to the drill project and check they open.
6. **Dev**: delete the drill project the same day; it holds real customer data.
7. **Dev**: write the date, how long it took and any problem in `docs/launch/BACKUPS.md` under "Drill log", and tell Jordan.

### Drill log

| Date | Who | Took | Result |
|---|---|---|---|
| | | | |

## Questions for Jordan

- [ ] Which Supabase plan is live on today?
- [ ] Option A or option B?
- [ ] Where do manual dumps and logo copies live?
- [ ] Retention above, and the Privacy page line about backups.
- [ ] OK for the developer to create the S3 key for the logo copy?

## Sources

- Supabase, Database backups: https://supabase.com/docs/guides/platform/backups
- Supabase, PITR usage and price: https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery
- Supabase, Compute prices: https://supabase.com/docs/guides/platform/manage-your-usage/compute
- Supabase, Pricing: https://supabase.com/pricing
- Supabase, Restore to a new project: https://supabase.com/docs/guides/platform/clone-project
- Supabase, Backup and restore with the CLI: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Supabase, S3 access keys: https://supabase.com/docs/guides/storage/s3/authentication
