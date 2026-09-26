# Build status

Live view of the parallel work (B-18). The leader session updates this after every merge. [Back to index](./README.md)

Rules set by the user on 2026-09-26: 3 worker sessions at once; the leader reviews and merges; new migrations go to customers-dev only until go-live.

## In progress

| Task | Worker pane | Worktree | Dev port | PR |
|---|---|---|---|---|
| B-08 Cache Components | 180 | CUSTOMERS-B08 | 3003 | #23 (rebasing on B-09) |
| B-07 CI on every pull request | 181 | CUSTOMERS-B07 | 3004 | not yet |
| B-10 Migration workflow and baseline | 182 | CUSTOMERS-B10 | 3005 | not yet |

## Done

B-06 (#22, main), B-09 (#21, mvp).

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
