# Build status

Live view of the parallel work (B-18). The leader session updates this after every merge. [Back to index](./README.md)

Rules set by the user on 2026-09-26: 3 worker sessions at once; the leader reviews and merges; new migrations go to customers-dev only until go-live.

## In progress

Nothing in progress. Up to five worker sessions at once are allowed since 2026-09-27.

## Done

64 of 81 tasks ticked. 9 more have their code merged and wait on people: B-24, B-25, B-32, B-33, B-34, B-51, B-78, B-79, B-84.

Into main: B-06, B-07, B-10, B-11, B-12, B-13. B-24 code (#32), open for labelling.
Into mvp: B-08, B-09, B-14 to B-17, B-20 to B-23, B-26 to B-31, B-35, B-36, B-38, B-40 to B-46, B-48 to B-50, B-52 to B-62, B-64 to B-74, B-77, B-82. Code merged, open for labelling: B-25 (#49), B-32 (#67), B-33 (#69), B-34 (#64), B-51 (#77). Code merged, open for a person's sign-off: B-78 (#126, legal review), B-79 (#119, D-73 reading), B-84 (#127, changed strings list).
Fixes into mvp: admin layout fix (#62), atomic `retry_scan_job` for admin Retry (#61), INFRA-01 isolated local test database per worktree (#88, fixes BUG-010), bug batch (#100, fixes BUG-023, BUG-028 to BUG-031, BUG-034, BUG-039, BUG-040), shared store for public rate limits (#101, SEC-07 follow-up to B-82, migration 039).
Fixes into mvp on 2026-09-29: old wording, header and contact title, unused packages (#104, fixes BUG-002, BUG-003, BUG-027), first scan waits for trial credits (#106, F-48), flaky tests (#107, fixes BUG-022, BUG-035, BUG-037, BUG-038), whole-product check (E2E-0929) wording and UI (#108, fixes BUG-043, BUG-046 to BUG-051), slow backend handling, credit capture under load and question race (#109, fixes BUG-044, BUG-045, BUG-052, BUG-053, migrations 040 and 041).
Fixes into mvp on 2026-09-30 and 2026-10-01: INFRA-02 one shared local test stack with heavy jobs queued (#120), UI audit fixes with 46 findings (#123, #124, #125, fixes BUG-052), wording pass (#127, fixes BUG-054 to BUG-056), final check fixes (#128, fixes BUG-057 to BUG-065), launch prep (#129: Node 24, migrations list, backup plan proposal in `docs/launch/BACKUPS.md`), launch runbook `docs/launch/RUNBOOK.md` (#119).
Tooling into main: leader fixes (#105, fixes BUG-033, BUG-041, BUG-042).

Open questions for people are in [FLAGS.md](./FLAGS.md).

## Waiting on people

| Item | Who | Unblocks |
|---|---|---|
| Replace keys (B-01) | Developer, Jordan | B-80 |
| Plan prices (D-21, D-22) | Jordan | B-40, B-43, B-72 |
| Email sending domain DNS | Jordan | B-61 |
| Eval labelling | Developer | B-24, B-33, B-34, B-51, B-75 |
| Calibration check (B-76) | Developer | B-83 |
| Legal review | Jordan or lawyer | B-78, B-79 |
| Beta users decision | Jordan | B-81 |

## Migrations applied to customers-dev but not yet to live

customers-dev has every migration up to 043 (applied on 2026-09-30 and 2026-10-01, fixes BUG-014). 021 to 023 were applied by B-13 after a backup.

Waiting for staging and live before launch: 021 to 043 (F-47, F-60, F-68). The list is in `supabase/migrations/README.md` on mvp (#129).
