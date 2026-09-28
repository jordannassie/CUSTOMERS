#!/bin/zsh
# Give a new worktree a node_modules without a full npm install: find another checkout of the same repo
# whose package-lock.json is identical and clone its node_modules copy-on-write (instant, no extra disk until
# a file changes, fully independent copy). Writes node_modules/.leader-clone-ok so the worker
# skips npm ci. If no lockfile matches, clones the closest one anyway (npm ci on top is faster) and
# leaves no marker, so the worker runs npm ci.
# Usage: tprep.sh <new-worktree-dir> [candidate checkout dirs...]  (default: every worktree of the repo)
NEW=${1:A}
# Copy-on-write clone: APFS on macOS (cp -c), btrfs or XFS on Linux (--reflink); plain copy elsewhere.
clone() { if [[ "$OSTYPE" == darwin* ]]; then cp -cR "$1" "$2"; else cp -R --reflink=auto "$1" "$2"; fi; }
shift
CANDIDATES=("$@")
if (( ${#CANDIDATES} == 0 )); then
  CANDIDATES=(${(f)"$(git -C "$NEW" worktree list --porcelain | awk '/^worktree /{print $2}')"})
fi
[[ -d "$NEW/node_modules" ]] && { echo "node_modules already present in $NEW"; exit 0; }

FALLBACK=""
for c in $CANDIDATES; do
  [[ "${c:A}" == "$NEW" || ! -d "$c/node_modules" || ! -f "$c/package-lock.json" ]] && continue
  [[ -z "$FALLBACK" ]] && FALLBACK=$c
  if cmp -s "$c/package-lock.json" "$NEW/package-lock.json"; then
    clone "$c/node_modules" "$NEW/node_modules" && touch "$NEW/node_modules/.leader-clone-ok"
    echo "cloned node_modules from $c (lockfile identical): worker can skip npm ci"
    exit 0
  fi
done
if [[ -n "$FALLBACK" ]]; then
  clone "$FALLBACK/node_modules" "$NEW/node_modules"
  echo "no identical lockfile; cloned from $FALLBACK as a head start: worker must run npm ci"
else
  echo "no checkout with node_modules found: worker must run npm ci"
fi
