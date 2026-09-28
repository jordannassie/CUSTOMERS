#!/usr/bin/env bash
# Manages the per-worktree local test stacks (BUG-010).
#   bash scripts/test-db.sh list         every claimed slot, its worktree, and whether its stack runs
#   bash scripts/test-db.sh stop         stop this worktree's stack, delete its data and free the slot
#   bash scripts/test-db.sh stop <slot>  the same for any slot, for a worktree that was removed
set -euo pipefail
cd "$(dirname "$0")/.."

registry="$(git rev-parse --path-format=absolute --git-common-dir)/test-db-slots"

# Sum of the memory the stack's containers use right now, in MiB.
stack_mem() {
  docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' 2>/dev/null |
    awk -v p="_$1\$" '$1 ~ p { v = $2; u = v; gsub(/[0-9.]/, "", u); gsub(/[^0-9.]/, "", v)
      m = u == "GiB" ? v * 1024 : u == "KiB" ? v / 1024 : v; t += m } END { printf "%.0f MiB", t }'
}

case "${1:-}" in
  list)
    printf '%-5s %-22s %-8s %-9s %s\n' SLOT PROJECT API RUNNING WORKTREE
    for s in $(seq 0 9); do
      running=no
      docker ps --format '{{.Names}}' | grep -qx "supabase_db_customers-direct-$s" && running="$(stack_mem "customers-direct-$s")"
      owner="$(cat "$registry/$s/worktree" 2>/dev/null || true)"
      [ -z "$owner" ] && [ "$running" = no ] && continue
      [ -n "$owner" ] && [ ! -d "$owner" ] && owner="$owner (removed)"
      printf '%-5s %-22s %-8s %-9s %s\n' "$s" "customers-direct-$s" $((55021 + s * 100)) "$running" "${owner:--}"
    done
    ;;
  stop)
    if [ -n "${2:-}" ]; then
      [[ "$2" =~ ^[0-9]$ ]] || { echo "Slot must be 0 to 9, got '$2'." >&2; exit 1; }
      slot="$2"
    else
      source scripts/test-db-env.sh
      slot="${TEST_DB_SLOT:?CI uses the default stack; there is no slot to stop}"
    fi
    # Only ever customers-direct-<slot>; the shared customers-direct stack is never stopped from here.
    supabase stop --project-id "customers-direct-$slot" --no-backup
    rm -rf "${registry:?}/$slot"
    [ -z "${2:-}" ] && rm -f .env.test.local
    echo "Stopped customers-direct-$slot and freed slot $slot."
    ;;
  *)
    echo "Usage: bash scripts/test-db.sh list | stop [slot]" >&2
    exit 1
    ;;
esac
