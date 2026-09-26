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
| Rebuild the local database from these files | `supabase db reset --local` (or `npm test`, which does it first) |
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
