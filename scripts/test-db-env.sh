# Sourced by the test-db scripts: picks the local Supabase stack this worktree tests against (INFRA-02, BUG-010).
# Default: the one shared stack (project customers-direct, the committed ports) that every worktree uses.
# A worktree whose supabase/migrations differ from where it branched off origin/mvp gets its own stack in a slot 0 to 9
# (project customers-direct-N, ports 55N00 to 55N99), so only a migration branch pays for a second stack.
# TEST_DB_ISOLATED=1 or 0 forces the choice. CI keeps the committed supabase/config.toml.
# The CLI reads SUPABASE_<SECTION>_<KEY> env vars over config.toml, so no config copy is needed.

TEST_DB_SLOTS=10
TEST_DB_REGISTRY="$(git rev-parse --path-format=absolute --git-common-dir)/test-db-slots"
TEST_DB_SHARED="$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)"

# Prints the slot this worktree already holds, if any.
test_db_own_slot() {
  local root s
  root="$(pwd -P)"
  for s in $(seq 0 $((TEST_DB_SLOTS - 1))); do
    if [ "$(cat "$TEST_DB_REGISTRY/$s/worktree" 2>/dev/null)" = "$root" ]; then echo "$s"; return; fi
  done
}

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
  s="$(test_db_own_slot)"
  if [ -n "$s" ]; then echo "$s"; return; fi
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
  echo "All $TEST_DB_SLOTS local test database slots are taken. Free one with npm run test:db:list and npm run test:db:clean." >&2
  return 1
}

# Exports the project id and ports for a slot.
test_db_use_slot() {
  local base=$((55000 + $1 * 100))
  export TEST_DB_PROJECT="$TEST_DB_SHARED-$1"
  export SUPABASE_PROJECT_ID="$TEST_DB_PROJECT"
  export SUPABASE_API_PORT=$((base + 21))
  export SUPABASE_DB_PORT=$((base + 22))
  export SUPABASE_DB_SHADOW_PORT=$((base + 20))
  export SUPABASE_DB_POOLER_PORT=$((base + 29))
  export SUPABASE_STUDIO_PORT=$((base + 23))
  export SUPABASE_LOCAL_SMTP_PORT=$((base + 24))
  export SUPABASE_ANALYTICS_PORT=$((base + 27))
  export SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT=$((base + 83))
}

# True when this branch adds or changes a migration, compared with where it branched off TEST_DB_BASE.
# Against the merge base, a branch that is only behind origin/mvp still counts as unchanged.
test_db_changes_migrations() {
  local base
  base="$(git merge-base HEAD "${TEST_DB_BASE:-origin/mvp}" 2>/dev/null)" || return 1
  ! git diff --quiet "$base" -- supabase/migrations ||
    [ -n "$(git ls-files --others --exclude-standard -- supabase/migrations)" ]
}

if [ -z "${CI:-}" ]; then
  unset TEST_DB_REASON
  if [ "${TEST_DB_ISOLATED:-}" = 1 ]; then
    TEST_DB_REASON="TEST_DB_ISOLATED=1"
  elif [ "${TEST_DB_ISOLATED:-}" != 0 ] && test_db_changes_migrations; then
    TEST_DB_REASON="this branch changes supabase/migrations"
  fi
  if [ -n "${TEST_DB_REASON:-}" ]; then
    slot="${TEST_DB_SLOT:-${LEADER_SLOT:-}}"
    if [ -n "$slot" ] && ! [[ "$slot" =~ ^[0-9]$ ]]; then
      echo "Test database slot must be 0 to 9, got '$slot'." >&2
      exit 1
    fi
    slot="$(test_db_claim_slot "$slot")" || exit 1
    test_db_use_slot "$slot"
    export TEST_DB_SLOT="$slot" TEST_DB_REASON
  else
    unset TEST_DB_SLOT SUPABASE_PROJECT_ID SUPABASE_API_PORT SUPABASE_DB_PORT SUPABASE_DB_SHADOW_PORT \
      SUPABASE_DB_POOLER_PORT SUPABASE_STUDIO_PORT SUPABASE_LOCAL_SMTP_PORT SUPABASE_ANALYTICS_PORT \
      SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT
    export TEST_DB_PROJECT="$TEST_DB_SHARED"
    # Only for testing these scripts: stands in for the shared stack on an unclaimed slot's project and ports.
    if [ -n "${TEST_DB_SHARED_SLOT:-}" ]; then test_db_use_slot "$TEST_DB_SHARED_SLOT"; fi
  fi
else
  export TEST_DB_PROJECT="$TEST_DB_SHARED"
fi
