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
# A source mid npm ci has a partial tree (for example typescript/lib with one file and no .bin); never clone that.
complete() {
  [[ -d "$1/node_modules/.bin" && -n "$(ls -A "$1/node_modules/.bin" 2>/dev/null)" ]] || return 1
  [[ -f "$1/node_modules/typescript/lib/typescript.js" ]] || return 1
  matches_lock "$1" || return 1
  ! npm_busy "${1:A}"
}
# A head-start clone from another lockfile is a complete tree with the wrong packages. npm writes the installed tree
# to node_modules/.package-lock.json; it must match package-lock.json (optional platform packages may be absent).
matches_lock() {
  [[ -f "$1/node_modules/.package-lock.json" ]] || return 1
  node -e '
    const read = p => JSON.parse(require("fs").readFileSync(p, "utf8")).packages || {};
    const want = read(process.argv[1]), have = read(process.argv[2]);
    const same = (a, b) => a.version === b.version && a.name === b.name;
    for (const [k, v] of Object.entries(want)) if (k && !(have[k] ? same(v, have[k]) : v.optional)) process.exit(1);
    for (const k of Object.keys(have)) if (k && !want[k]) process.exit(1);
  ' "$1/package-lock.json" "$1/node_modules/.package-lock.json"
}
# npm ci runs with the worktree as its cwd. Anchor on the npm process itself so shells that mention npm do not match.
npm_busy() {
  local pid
  for pid in $(pgrep -f '^(npm|node [^ ]*npm[^ ]*) (ci|install|i)( |$)'); do
    [[ "$(lsof -a -p $pid -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" == "$1"* ]] && return 0
  done
  return 1
}
shift
CANDIDATES=("$@")
if (( ${#CANDIDATES} == 0 )); then
  CANDIDATES=(${(f)"$(git -C "$NEW" worktree list --porcelain | awk '/^worktree /{print $2}')"})
fi
[[ -d "$NEW/node_modules" ]] && { echo "node_modules already present in $NEW"; exit 0; }

FALLBACK=""
for c in $CANDIDATES; do
  [[ "${c:A}" == "$NEW" || ! -d "$c/node_modules" || ! -f "$c/package-lock.json" ]] && continue
  complete "$c" || { echo "skipping $c: node_modules incomplete, not matching its lockfile, or npm running there"; continue; }
  [[ -z "$FALLBACK" ]] && FALLBACK=$c
  if cmp -s "$c/package-lock.json" "$NEW/package-lock.json"; then
    clone "$c/node_modules" "$NEW/node_modules" && touch "$NEW/node_modules/.leader-clone-ok"
    if complete "$NEW"; then
      echo "cloned node_modules from $c (lockfile identical): worker can skip npm ci"
    else
      rm -f "$NEW/node_modules/.leader-clone-ok"
      echo "cloned from $c but the copy is incomplete: worker must run npm ci"
    fi
    exit 0
  fi
done
if [[ -n "$FALLBACK" ]]; then
  clone "$FALLBACK/node_modules" "$NEW/node_modules"
  echo "no identical lockfile; cloned from $FALLBACK as a head start: worker must run npm ci"
else
  echo "no checkout with node_modules found: worker must run npm ci"
fi
