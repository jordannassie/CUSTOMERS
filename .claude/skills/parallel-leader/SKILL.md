---
name: parallel-leader
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/tlaunch.sh *), Bash(${CLAUDE_SKILL_DIR}/scripts/twatch.sh *), Bash(${CLAUDE_SKILL_DIR}/scripts/tprep.sh *)
description: Lead a multi-task build plan with several parallel Claude Code worker sessions (one git worktree and tmux session per task), reviewing and merging their PRs yourself. Use when the user asks to "lead the build plan", "run workers in parallel", "keep 3 to 5 panes going", or continue a leader session after a handoff.
---

# Parallel leader

You coordinate. Workers build. Each task runs in its own Claude Code session inside its own git worktree and tmux session; you review, merge, and keep every slot full. Keep your own context small: read PR summaries and diffs, not whole files.

Project specifics (repo, CI, rules, current state) live in the project: read the project's own leader notes if it has them (for example `PROJECT.md` next to this file when the skill lives in the project repo), the project's CLAUDE.md, its build plan, and its STATUS file first.

## Setup (once per session)

1. Read the state file `~/.leader/<repo>/state.md` first (if missing, create it from `state.example.md` next to this file: Settings, Workers, Done, Next ready, Not yet posted, Waiting on the user): it is the leader's memory on disk and survives reboots and handoffs, unlike the scratchpad in /tmp. Keep it current after every launch, merge, flag and bug: workers table, done list, next ready, unposted ticks, flags and bugs, and what waits on the user. The watcher's reviewed-PR list lives next to it (`LEADER_SEEN=~/.leader/<repo>/reviewed-prs.txt`). Then read memory and the project STATUS file. List open PRs (`gh pr list`) and worktrees (`git worktree list`). Existing worktrees with pushed commits are resumable, not lost.
2. Keep the machine awake: macOS `caffeinate -dimsu -t 43200`, Linux `systemd-inhibit --what=idle:sleep sleep 43200`, in the background. Re-run when it ends.
3. Run the scripts from `${CLAUDE_SKILL_DIR}/scripts/` (the folder next to this SKILL.md, wherever the skill is installed); do not copy them to /tmp, which a reboot wipes.
4. Confirm the worker limit with the user (default 5). More workers than ready tasks, or a shared test database, only slows things down.

## The loop

1. **Pick ready tasks.** A task is ready when every "Depends on" task is merged into the branch it targets (use the project's readiness script if it has one). Skip tasks blocked on keys, people or decisions: log them as flags instead.
2. **Create the worktree** from the target branch with `--no-track` (a tracked `origin/main` upstream makes a plain `git push` aim at main). Copy the local env file in. Then run `${CLAUDE_SKILL_DIR}/scripts/tprep.sh <worktree>`: it APFS-clones `node_modules` from any checkout with an identical `package-lock.json` (about 10 seconds, no download, no extra disk) and marks it so the worker skips `npm ci`. If no lockfile matches, it clones the closest one as a head start and the worker runs `npm ci`. Never symlink a shared `node_modules` (one install would change every worktree, and Next.js rejects node_modules outside the project).
3. **Write the brief to a file** outside the repo (for example `../.leader-briefs/B-xx.txt`): task-specific part first, then the common rules (template in `${CLAUDE_SKILL_DIR}/scripts/brief-common.example.txt`). Never type a long brief into a terminal: long typed text gets cut off.
4. **Launch:** `${CLAUDE_SKILL_DIR}/scripts/tlaunch.sh <session> <worktree> <brief-file>`. It starts tmux, starts `claude`, waits for the input box, and sends one line: "Read your full task brief in <file> and follow it exactly."
5. **Give the user a window to watch:** open a terminal window running `tmux attach -t <session>` (one call, no polling). Closing that window only detaches.
6. **Watch:** always run `${CLAUDE_SKILL_DIR}/scripts/twatch.sh <sessions...>` in the background (run_in_background, never detached). It exits when a worker's turn ends (Claude's "· done <time>" line with no spinner and no "still running" shells) or when a new non-draft PR appears (it keeps a reviewed-PR list). Restart it after every merge, spawn or close. Never leave it off.
7. **Review each finished PR** (see checklist). If something is wrong, send the worker a short, specific fix request with `tmux send-keys -t <s> -l "..."` then `tmux send-keys -t <s> Enter`.
8. **Merge** only when CI is fully green and the review passes. Chain cleanup with `&&` after a successful merge only: `gh pr merge N --merge && tmux kill-session -t s && git worktree remove --force ../W`. Never remove a worktree before its PR is merged.
9. **Batch the paperwork:** keep ticks, flags and bugs in a scratch file; post them to the plan, FLAGS and BUGS files in one docs PR every few merges. Workers never edit those shared files (they cause merge conflicts); they list bugs in their PR comment.
10. **Sync** long-lived branches (for example main into mvp) through a worker when the target branch falls behind.

## Review checklist

- Diff matches the task. No scope creep into other tasks' files.
- CI all green. A red check you think is flaky: rerun once; if it fails again, it is a real bug: have a worker find the root cause (no skips, no retry wrappers).
- Money, auth, security, migrations: read the actual code (SQL functions, RLS, grants, who can call what). Security problems go in private notes, never the public repo.
- Lockfile: every `resolved` URL is the npm registry; check new packages and install scripts.
- UI: look at the worker's screenshots at desktop and phone widths before merging; ask for them if missing.
- Worker flags: decide the safe default, log the rest as flags for the user.

## Requirements

Claude Code, git, `gh` (logged in), `tmux`, `zsh`. macOS or Linux. Fast `node_modules` cloning needs a copy-on-write filesystem (APFS, btrfs, XFS); otherwise it falls back to a normal copy.

## Rules learned the hard way

- Brief files, not typed text. One short line into the terminal.
- Never poll the terminal app's CLI in loops (WezTerm's mux hung). tmux `capture-pane` is fine.
- A `caffeinate` process and tmux do not survive a reboot. After a restart, check `uptime`, relaunch workers from their worktrees with a "resume" brief ("an earlier session built this and opened PR #N; do not start over").
- API or network errors stop a worker's turn: tell it to continue.
- Only one worker at a time changes migrations or the database.
- When keys are exposed or not yet issued, workers build against mocks and fixtures and make no real external calls; the real check becomes a flag.
- Parallel PRs touching the same file will conflict; expect rebase requests and keep shared docs out of worker PRs.
- A shared local test database makes parallel test runs flaky; rerun or serialize DB-heavy tests.
- Permission or classifier denials are not flags: report them to the user and stop that action.
- Answer the user in short status bullets; they check in often.

## Handoff (when your context passes about 75%)

Make sure `~/.leader/<repo>/state.md` is current (it already holds open PRs, sessions, flags and bugs if you kept it up to date), add a one-line pointer to it in memory, then tell the user to start a new session and say "go".

## Test isolation

Parallel workers must not share one test database: resets and seed data collide and every test run becomes flaky. Give each worktree its own local stack or database (unique project id and port block per worktree), and stop a worktree's stack when its worktree is removed.
