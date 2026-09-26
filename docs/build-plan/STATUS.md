# Build status

Live view of the parallel work (B-18). The leader session updates this after every merge. [Back to index](./README.md)

Rules set by the user on 2026-09-26: 3 worker sessions at once; the leader reviews and merges; new migrations go to customers-dev only until go-live.

## In progress

| Task | Worker pane | Worktree | Dev port | PR |
|---|---|---|---|---|
| B-64 Admin shell | 196 | CUSTOMERS-B64 | 3016 | not yet |
| B-48 App shell | 197 | CUSTOMERS-B48 | 3017 | not yet |
| B-20 Provider interface and OpenAI adapter | 198 | CUSTOMERS-B20 | 3018 | not yet |

Waiting for keys, people or Jordan: B-24 dataset (F-04), B-32 (F-16), B-34 (F-28), B-40 (F-17), B-61 (F-12).

## Done

Into main: B-06 (#22), B-07 (#25), B-10 (#27), B-11 (#31), B-12 (#34), B-13 (#36). B-24 code (#32), task open for labelling.
Into mvp: B-08 (#23), B-09 (#21), B-70 (#26), B-71 (#28), B-15 (#35), B-17 (#37), B-16 (#39), B-14 (#40, live run waits for go-live).
Main synced into mvp: #29, #33, #38.

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
