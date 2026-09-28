# Project notes: Customers.Direct

Settings for running the parallel leader on this repo. Paths assume the repo is cloned at `~/ehtisham-all-projects/CUSTOMERS`; adjust `REPO_DIR` if yours is elsewhere.

- `export LEADER_REPO=jordannassie/CUSTOMERS LEADER_IGNORE_PRS=3 LEADER_SEEN=~/.leader/CUSTOMERS/reviewed-prs.txt`. PR #3 is an old infected branch: never touch it.
- `main` is the live site; most UI tasks target `mvp`. Build plan: `docs/build-plan/`. Readiness: `npm run task:ready B-xx`. Live status for everyone: `docs/build-plan/STATUS.md`; the leader's own state: `~/.leader/CUSTOMERS/state.md`.
- Briefs live outside the repo in `$REPO_DIR/../.leader-briefs/`; worktrees are `$REPO_DIR/../CUSTOMERS-Bxx`; tmux sessions are named `bxx`; dev ports 3001 and up, one per worker.
- Common brief: `scripts/brief-common.example.txt` with the writing guide path `$REPO_DIR/docs/design/WRITING.md`, plus these project rules:
  - API keys are treated as exposed until B-01: workers make no real AI, Google Places, Firecrawl, Stripe or Resend calls and test against mocks and fixtures.
  - Migrations go to the local stack only until customers-dev is reachable again (F-24), listed under "Pending" in the PR. Live is untouched until go-live.
  - Only one worker at a time changes migrations or the database.
  - Every user-facing word follows `docs/design/WRITING.md`.
- Security findings stay out of this public repo: keep them in a private notes file on your own machine.
- Never touch a worktree another session owns (for example `CUSTOMERS-B18`) or a Conductor workspace.
