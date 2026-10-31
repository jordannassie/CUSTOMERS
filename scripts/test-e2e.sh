#!/usr/bin/env bash
# Runs Playwright (INFRA-02). CI runs it as before, after its own reset step. Locally it gets the test database ready
# first and holds it for the run, so no reset can happen under it. A full run, one that names no spec, also waits its
# turn in the heavy queue (scripts/heavy.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -n "${CI:-}" ] && exec playwright test "$@"

cmd=(bash scripts/test-db-reset.sh playwright test "$@")
for arg in "$@"; do
  case "$arg" in *spec* | *e2e/*) exec "${cmd[@]}" ;; esac
done
exec bash scripts/heavy.sh "${cmd[@]}"
