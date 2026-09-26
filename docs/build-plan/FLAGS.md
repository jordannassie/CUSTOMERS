# Flags for review

Things the build could not settle on its own: checks that could not be run, decisions that need a person, and follow-ups. The leader session adds a row and keeps building; the team reviews this list together. Bugs go in [BUGS.md](../BUGS.md). Security items stay in the private notes while the repo is public and are listed here by ID only. [Back to index](./README.md)

| ID | Raised | Task | What needs a person | Status |
|---|---|---|---|---|
| F-01 | 2026-09-26 | B-09 (PR #21) | `/design-preview` has not been opened while logged in as an admin. The same component was checked from a temporary logged-out route at 1440 and 390, and logged-out visitors are redirected to login. Merged into `mvp` on that basis. Open it once with an admin account. | Open |
| F-02 | 2026-09-26 | B-08 (PR #23) | Hosting test (D-41): logged-in dashboard and admin were not checked on the Netlify preview, because it uses the live database and needs a live test login. Everything else passed there. | Open |
| F-03 | 2026-09-26 | B-06 (PR #22) | Security item S-1 (private notes) needs a decision; it affects the live site. | Open |
| F-04 | 2026-09-26 | B-24 | Mention detection eval needs answers labelled by people before it can start (eval rule: labels are never generated). | Open |
| F-05 | 2026-09-27 | B-07 (PR #25) | Jordan must turn on branch protection for `main` and `mvp` (the working account has no admin rights). The "a PR with a type error is blocked" demo waits for this. | Open |
| F-06 | 2026-09-27 | B-07 (PR #25) | Add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` as repository secrets before the first AI-graded eval (B-51). Use the new keys from B-01, not the old ones. | Open |
| F-07 | 2026-09-27 | B-07 (PR #25) | Lint fixes touched the billing trial-days line and the admin accounts, leads and news screens. CI and logged-out checks pass, but nobody clicked through them logged in. | Open |
| F-08 | 2026-09-27 | B-07 (PR #25) | The worker made one local, never-pushed commit with git hooks turned off during a trial build; it scanned the code by hand (clean) and reported it. Worker briefs now forbid this outright. | Open |
| F-09 | 2026-09-27 | B-10 (PR #27) | Data API grants: live gives every public table to the anon and authenticated roles by default; local copies this with `auto_expose_new_tables`, which the Supabase CLI removes on 2026-10-30. Decide: write the grants into a migration, or revoke them on live. Decide before 2026-10-30. | Open |
| F-10 | 2026-09-27 | B-10 (PR #27) | Migration 015 (safer signup trigger) never ran on live, and `020_live_baseline.sql` restores live's older trigger on fresh databases. Decide whether to reapply 015's version in a new migration. | Open |
| F-11 | 2026-09-27 | B-10 (PR #27) | Go-live: live has no migration history. Run the migration repair in `supabase/migrations/README.md` (after a backup) before the first push to live. Belongs in the B-80 checklist. | Open |
| F-12 | 2026-09-27 | B-61 | Needs Jordan's DNS access to verify the sending domain in Resend. B-61 also waits for B-11 (agencies table). | Open |
| F-13 | 2026-09-27 | B-17 | Security item found while verifying admin access; reported to the user directly (private notes). Affects the live site. | Open |
