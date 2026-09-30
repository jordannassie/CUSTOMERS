#!/usr/bin/env bash
# Manages the local test stacks (BUG-010, INFRA-02).
#   bash scripts/test-db.sh list                 the shared stack and every slot: worktree, memory, whether in use
#   bash scripts/test-db.sh stop                 stop this worktree's own stack, delete its data and free the slot
#   bash scripts/test-db.sh stop <slot>          the same for any slot, for a worktree that was removed
#   bash scripts/test-db.sh clean [--dry] [slot ...]
#                                                stop and free every slot stack no worktree needs any more: skips one
#                                                that is in use right now or whose branch still changes migrations
set -euo pipefail
cd "$(dirname "$0")/.."
# Only the helpers: listing or cleaning must not claim a slot for this worktree.
TEST_DB_ISOLATED=0 source scripts/test-db-env.sh
source scripts/test-lock.sh

# Sum of the memory the stack's containers use right now, in MiB.
stack_mem() {
  docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' 2>/dev/null |
    awk -v p="_$1\$" '$1 ~ p { v = $2; u = v; gsub(/[0-9.]/, "", u); gsub(/[^0-9.]/, "", v)
      m = u == "GiB" ? v * 1024 : u == "KiB" ? v / 1024 : v; t += m } END { printf "%.0f MiB", t }'
}
running() { docker ps --format '{{.Names}}' | grep -qx "supabase_db_$1"; }
owner_of() { cat "$TEST_DB_REGISTRY/$1/worktree" 2>/dev/null || true; }

# Takes both locks of a stack without waiting, so it is stopped only when no session is setting it up or testing on it.
# Descriptors are opened per call and stay open until the script exits.
lock_idle() {
  exec 7>>"$TEST_LOCK_DIR/$1.setup.lock" 8>>"$TEST_LOCK_DIR/$1.db.lock"
  test_lock 7 ex && test_lock 8 ex
}
unlock() { exec 7>&- 8>&-; }

stop_slot() {
  # Only ever customers-direct-<slot>; the shared stack is never stopped from here.
  supabase stop --project-id "$TEST_DB_SHARED-$1" --no-backup 7>&- 8>&-
  rm -rf "${TEST_DB_REGISTRY:?}/$1"
  echo "Stopped $TEST_DB_SHARED-$1 and freed slot $1."
}

case "${1:-}" in
  list)
    printf '%-5s %-22s %-8s %-9s %s\n' SLOT PROJECT API RUNNING WORKTREE
    running "$TEST_DB_SHARED" && mem="$(stack_mem "$TEST_DB_SHARED")" || mem=no
    printf '%-5s %-22s %-8s %-9s %s\n' - "$TEST_DB_SHARED" 54621 "$mem" "shared by every worktree"
    for s in $(seq 0 9); do
      running "$TEST_DB_SHARED-$s" && mem="$(stack_mem "$TEST_DB_SHARED-$s")" || mem=no
      owner="$(owner_of "$s")"
      [ -z "$owner" ] && [ "$mem" = no ] && continue
      [ -n "$owner" ] && [ ! -d "$owner" ] && owner="$owner (removed)"
      printf '%-5s %-22s %-8s %-9s %s\n' "$s" "$TEST_DB_SHARED-$s" $((55021 + s * 100)) "$mem" "${owner:--}"
    done
    ;;
  stop)
    if [ -n "${2:-}" ]; then
      [[ "$2" =~ ^[0-9]$ ]] || { echo "Slot must be 0 to 9, got '$2'." >&2; exit 1; }
      stop_slot "$2"
    else
      slot="$(test_db_own_slot)"
      [ -n "$slot" ] || { echo "This worktree has no stack of its own; the shared $TEST_DB_SHARED stack is never stopped from here."; exit 0; }
      stop_slot "$slot"
      grep -q ":$((55021 + slot * 100))" .env.test.local 2>/dev/null && rm -f .env.test.local
    fi
    ;;
  clean)
    shift
    dry=""
    [ "${1:-}" = --dry ] && { dry=1; shift; }
    slots=("$@")
    [ $# -gt 0 ] || slots=($(seq 0 9))
    for s in "${slots[@]}"; do
      [[ "$s" =~ ^[0-9]$ ]] || { echo "Slot must be 0 to 9, got '$s'." >&2; exit 1; }
      owner="$(owner_of "$s")"
      running "$TEST_DB_SHARED-$s" || [ -n "$owner" ] || continue
      if ! lock_idle "$TEST_DB_SHARED-$s"; then
        echo "Kept slot $s: a session is using it right now."
      elif [ -d "$owner" ] && (cd "$owner" && test_db_changes_migrations); then
        echo "Kept slot $s: $owner still changes supabase/migrations."
      elif [ -n "$dry" ]; then
        echo "Would stop $TEST_DB_SHARED-$s and free slot $s (${owner:-no worktree})."
      else
        stop_slot "$s"
      fi
      unlock
    done
    ;;
  *)
    echo "Usage: bash scripts/test-db.sh list | stop [slot] | clean [--dry] [slot ...]" >&2
    exit 1
    ;;
esac
