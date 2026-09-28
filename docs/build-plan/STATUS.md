# Build status

Live view of the parallel work (B-18). The leader session updates this after every merge. [Back to index](./README.md)

Rules set by the user on 2026-09-26: 3 worker sessions at once; the leader reviews and merges; new migrations go to customers-dev only until go-live.

## In progress

Three worker sessions at once (up to five allowed since 2026-09-27).

| Task | Worker pane | Worktree | PR |
|---|---|---|---|
| B-46 Billing page | b46 | CUSTOMERS-B46 | #93 |
| B-59 Share page | b59 | CUSTOMERS-B59 | #91 |
| B-69 Alerts | b69 | CUSTOMERS-B69 | not yet |

## Done

Into main: B-06, B-07, B-10, B-11, B-12, B-13. B-24 code (#32), open for labelling.
Into mvp: B-08, B-09, B-14 to B-17, B-20 to B-23, B-26 to B-31, B-36, B-38, B-40 to B-44, B-48 to B-50, B-52 to B-58, B-61, B-64 to B-68, B-70 to B-74. Code merged, open for labelling: B-25 (#49), B-32 (#67), B-33 (#69), B-34 (#64), B-51 (#77).
Fixes into mvp: admin layout fix (#62), atomic `retry_scan_job` for admin Retry (#61), INFRA-01 isolated local test database per worktree (#88, fixes BUG-010).

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

021_core_tables, 022_credit_tables, 023_credit_functions (applied by B-13 after a backup).

Not yet on customers-dev either (F-24): 024_legacy_data_columns, 025_backfill_existing_data (on mvp).
