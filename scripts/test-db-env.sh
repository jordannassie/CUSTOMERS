# Sourced by the test-db scripts: gives this worktree its own local Supabase stack (BUG-010).
# Each worktree claims a slot 0 to 9; slot N runs as project customers-direct-N on ports 55N00 to 55N99,
# so parallel workers never reset each other's database. CI keeps the committed supabase/config.toml.
# The CLI reads SUPABASE_<SECTION>_<KEY> env vars over config.toml, so no config copy is needed.

TEST_DB_SLOTS=10
TEST_DB_REGISTRY="$(git rev-parse --path-format=absolute --git-common-dir)/test-db-slots"

# Prints this worktree's slot, claiming the first free one. A claim whose worktree folder is gone is reused.
test_db_claim_slot() {
  local root owner s
  root="$(pwd -P)"
  mkdir -p "$TEST_DB_REGISTRY"
  if [ -n "${1:-}" ]; then
    owner="$(cat "$TEST_DB_REGISTRY/$1/worktree" 2>/dev/null || true)"
    if [ -n "$owner" ] && [ "$owner" != "$root" ] && [ -d "$owner" ]; then
      echo "Test database slot $1 belongs to $owner." >&2
      return 1
    fi
    mkdir -p "$TEST_DB_REGISTRY/$1"
    echo "$root" > "$TEST_DB_REGISTRY/$1/worktree"
    echo "$1"
    return
  fi
  for s in $(seq 0 $((TEST_DB_SLOTS - 1))); do
    if [ "$(cat "$TEST_DB_REGISTRY/$s/worktree" 2>/dev/null)" = "$root" ]; then echo "$s"; return; fi
  done
  for s in $(seq 0 $((TEST_DB_SLOTS - 1))); do
    # mkdir is atomic, so two worktrees starting at once cannot take the same slot.
    if mkdir "$TEST_DB_REGISTRY/$s" 2>/dev/null; then
      echo "$root" > "$TEST_DB_REGISTRY/$s/worktree"
      echo "$s"
      return
    fi
    owner="$(cat "$TEST_DB_REGISTRY/$s/worktree" 2>/dev/null || true)"
    if [ -n "$owner" ] && [ ! -d "$owner" ]; then
      echo "$root" > "$TEST_DB_REGISTRY/$s/worktree"
      echo "$s"
      return
    fi
  done
  echo "All $TEST_DB_SLOTS local test database slots are taken. Free one with npm run test:db:list and npm run test:db:stop." >&2
  return 1
}

# Exports the project id and ports for a slot.
test_db_use_slot() {
  local base=$((55000 + $1 * 100))
  export TEST_DB_SLOT="$1"
  export SUPABASE_PROJECT_ID="customers-direct-$1"
  export SUPABASE_API_PORT=$((base + 21))
  export SUPABASE_DB_PORT=$((base + 22))
  export SUPABASE_DB_SHADOW_PORT=$((base + 20))
  export SUPABASE_DB_POOLER_PORT=$((base + 29))
  export SUPABASE_STUDIO_PORT=$((base + 23))
  export SUPABASE_LOCAL_SMTP_PORT=$((base + 24))
  export SUPABASE_ANALYTICS_PORT=$((base + 27))
  export SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT=$((base + 83))
}

if [ -z "${CI:-}" ]; then
  slot="${TEST_DB_SLOT:-${LEADER_SLOT:-}}"
  if [ -n "$slot" ] && ! [[ "$slot" =~ ^[0-9]$ ]]; then
    echo "Test database slot must be 0 to 9, got '$slot'." >&2
    exit 1
  fi
  slot="$(test_db_claim_slot "$slot")" || exit 1
  test_db_use_slot "$slot"
fi
