# Build status

Live view of the parallel work (B-18). The leader session updates this after every merge. [Back to index](./README.md)

Rules set by the user on 2026-09-26: 3 worker sessions at once; the leader reviews and merges; new migrations go to customers-dev only until go-live.

## In progress

Five worker sessions at once (raised from 3 on 2026-09-27).

| Task | Worker pane | Worktree | PR |
|---|---|---|---|
| B-29 Manual Run scan | 212 | CUSTOMERS-B29 | #57 (rebasing) |
| B-31 Test mode | 211 | CUSTOMERS-B31 | #58 (fixing CI flake) |
| Admin layout fix | 215 | CUSTOMERS-FIXADMIN | not yet |
| B-40 Stripe setup (mocked, no Stripe calls) | 216 | CUSTOMERS-B40 | not yet |
| B-34 Business auto-fill (mocked) | 217 | CUSTOMERS-B34 | not yet |

## Done

Into main: B-06, B-07, B-10, B-11, B-12, B-13. B-24 code (#32), open for labelling.
Into mvp: B-08, B-09, B-14 to B-17, B-20 to B-23, B-26 to B-28, B-30, B-48, B-55, B-56, B-64, B-66 to B-68, B-70, B-71, B-73. B-25 code (#49), open for labelling.

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
