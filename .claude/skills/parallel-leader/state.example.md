# Leader state: <project name>

The leader's working memory on disk (survives reboots and handoffs). Keep it at `~/.leader/<repo>/state.md` and update it after every launch, merge, flag or bug. The watcher's reviewed-PR list lives next to it as `reviewed-prs.txt`.

Last updated: <date and time> by <who>.

## Settings

- `export LEADER_REPO=<owner/name> LEADER_IGNORE_PRS="<PR numbers to ignore>" LEADER_SEEN=~/.leader/<repo>/reviewed-prs.txt`
- Worker limit: <n>. Briefs in `<folder outside the repo>`. Worktrees `../<repo>-<task>`. tmux sessions named after the task.
- Common brief: `scripts/brief-common.example.txt` with this project's writing guide and safety rules added.

## Workers

| Task | Worktree | PR | Needs |
|---|---|---|---|

## Done

## Next ready

## Not yet posted to the repo docs

Ticks:

Flags:

Bugs:

## Waiting on the user
