# Build status

Live view of the parallel work (B-18). The leader session updates this after every merge. [Back to index](./README.md)

Rules set by the user on 2026-09-26: 3 worker sessions at once; the leader reviews and merges; new migrations go to customers-dev only until go-live.

## In progress

| Task | Worker pane | Worktree | Dev port | PR |
|---|---|---|---|---|
| B-71 New homepage | 184 | CUSTOMERS-B71 | 3006 | #28 (draft) |
| B-11 Core tables (only session changing migrations) | 186 | CUSTOMERS-B11 | 3008 | not yet |

Next when a slot frees: B-12 after B-11; B-61 after B-11. B-24 waits for eval labelling (F-04).

## Done

B-06 (#22, main), B-07 (#25, main), B-08 (#23, mvp), B-09 (#21, mvp), B-10 (#27, main), B-70 (#26, mvp). Main synced into mvp in #29.

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

None yet.
