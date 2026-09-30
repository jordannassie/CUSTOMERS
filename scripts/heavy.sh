#!/usr/bin/env bash
# Runs a heavy command (the full test run, the build, a full e2e run) one at a time across every session on this
# machine, so parallel sessions take turns instead of overloading it (INFRA-02). Usage: bash scripts/heavy.sh <command>
# CI and Netlify run the command directly. HEAVY_JOBS=2 lets two run at once; HEAVY_WAIT_MINUTES sets the wait limit.
set -euo pipefail

# A heavy command started by another one (HEAVY_QUEUE_HELD) already has its turn.
if [ -n "${CI:-}${NETLIFY:-}${HEAVY_QUEUE_HELD:-}" ] || ! command -v perl >/dev/null; then
  exec "$@"
fi
source "$(dirname "$0")/test-lock.sh"

label="npm run ${npm_lifecycle_event:-$1}"
jobs="${HEAVY_JOBS:-1}"
limit=$((${HEAVY_WAIT_MINUTES:-60} * 60))

take_turn() {
  local i
  for i in $(seq 1 "$jobs"); do
    exec 6>>"$TEST_LOCK_DIR/heavy.$i.lock"
    if test_lock 6 ex; then
      echo "$label in $(basename "$PWD"), started $(date +%H:%M:%S)" > "$TEST_LOCK_DIR/heavy.$i.owner"
      return 0
    fi
    exec 6>&-
  done
  return 1
}

waited=0
if ! take_turn; then
  echo "Waiting for another session's test run or build to finish before $label. Running now:" >&2
  for i in $(seq 1 "$jobs"); do echo "  $(cat "$TEST_LOCK_DIR/heavy.$i.owner" 2>/dev/null)" >&2; done
  until take_turn; do
    if [ "$waited" -ge "$limit" ]; then
      echo "Still waiting after $((limit / 60)) minutes, giving up. Check the command above is not stuck." >&2
      exit 1
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo "Waited ${waited}s, starting $label." >&2
fi

# Descriptor 6 stays open in the command, so the turn lasts until it and its children exit.
HEAVY_QUEUE_HELD=1 exec "$@"
