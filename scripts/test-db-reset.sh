#!/usr/bin/env bash
# Gets the local Supabase database ready for tests (MVP_SPEC 21) and writes its URL and keys to .env.test.local,
# which vitest.config.mts and playwright.config.ts read. Usage: bash scripts/test-db-reset.sh [command to run after]
# CI rebuilds it from supabase/migrations every time. Locally the stack is shared by every worktree (INFRA-02), so it
# is rebuilt only when the migrations changed, and never while another session's tests are running on it.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/test-db-env.sh

# Services the tests do not use; skipping them keeps start-up fast and light. Storage stays on for the logo upload spec (B-55).
EXCLUDE="studio,imgproxy,vector,logflare,edge-runtime,realtime,postgres-meta,supavisor"

# Right after a start, status can print before the stack reports its URLs.
load_status() {
  local status=""
  for _ in $(seq 1 60); do
    status="$(supabase status -o env 2>/dev/null || true)"
    grep -q '^API_URL=' <<<"$status" && break
    sleep 1
  done
  if ! grep -q '^API_URL=' <<<"$status"; then
    echo "Local Supabase status has no API_URL" >&2
    exit 1
  fi
  eval "$status"
}

# The reset recreates the db and auth containers while PostgREST and Kong keep running and reconnect, so the
# gateway can answer 502 for a moment. Start the tests only once REST (with the schema) and auth answer 200
# several times in a row (BUG-017).
wait_ready() {
  ready=0
  for _ in $(seq 1 120); do
    rest=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/rest/v1/plans?select=id&limit=1" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" || true)
    auth=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/auth/v1/health" -H "apikey: $ANON_KEY" || true)
    if [ "$rest" = 200 ] && [ "$auth" = 200 ]; then ready=$((ready + 1)); else ready=0; fi
    [ "$ready" -ge 5 ] && return 0
    sleep 0.5
  done
  return 1
}

# Kong can keep the old address of a recreated container and answer 502 until restarted.
make_ready() {
  load_status
  if ! wait_ready; then
    echo "Gateway not ready (REST $rest, auth $auth), restarting Kong" >&2
    docker restart "supabase_kong_$TEST_DB_PROJECT" >/dev/null
    if ! wait_ready; then
      echo "Local Supabase did not become ready (REST $rest, auth $auth)" >&2
      exit 1
    fi
  fi
}

write_env() {
  cat > .env.test.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_DB_URL=$DB_URL
ENV
}

# Lock descriptors are closed for the CLI so nothing it leaves behind can hold them.
start_stack() { supabase start -x "$EXCLUDE" 6>&- 7>&- 8>&-; }

if [ -n "${CI:-}" ]; then
  supabase status >/dev/null 2>&1 || start_stack
  supabase db reset --local --no-seed
  make_ready
  write_env
  [ $# -gt 0 ] && exec "$@"
  exit 0
fi

source scripts/test-lock.sh

running() { [ "$(docker inspect -f '{{.State.Running}}' "supabase_$1_$TEST_DB_PROJECT" 2>/dev/null)" = true ]; }
db_sql() { docker exec "supabase_db_$TEST_DB_PROJECT" psql -U postgres -d postgres -tAq -v ON_ERROR_STOP=1 -c "$1"; }
# File names and contents of every migration, so a rename, edit, new or removed file all count as a change.
migrations_hash() {
  (cd supabase/migrations && find . -name '*.sql' -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256) | shasum -a 256 | cut -c1-64
}
# The hash of the migrations the database was last rebuilt from; a reset drops the schema that holds it.
stored_hash() { db_sql "select obj_description(oid, 'pg_namespace') from pg_namespace where nspname = 'test_db'" 2>/dev/null || true; }

# Two locks per stack. The setup lock is held by the one session checking, starting or resetting the stack. Every
# session running tests holds the db lock shared, and a reset needs it exclusive, so a reset waits until nobody is
# mid-run. The command below inherits descriptor 8, so its shared hold lasts until it and its children exit.
exec 7>>"$TEST_LOCK_DIR/$TEST_DB_PROJECT.setup.lock" 8>>"$TEST_LOCK_DIR/$TEST_DB_PROJECT.db.lock"
test_lock_wait 7 ex 30 "Waiting for another session to finish starting or resetting the test database $TEST_DB_PROJECT."

echo "Test database: $TEST_DB_PROJECT (${TEST_DB_REASON:-shared by every worktree})" >&2
if [ "$TEST_DB_PROJECT" = "$TEST_DB_SHARED" ] && [ -n "$(test_db_own_slot)" ]; then
  echo "This worktree no longer needs its own stack; npm run test:db:stop frees it." >&2
fi

restart=""
if running db && ! running storage; then restart=1; fi
running db || start_stack
want="$(migrations_hash)"
if [ -n "$restart" ] || [ "$(stored_hash)" != "$want" ]; then
  test_lock_wait 8 ex "${TEST_DB_WAIT_MINUTES:-30}" \
    "The migrations changed, so $TEST_DB_PROJECT needs a reset. Waiting for another session's test run on it to finish first."
  if [ -n "$restart" ]; then
    echo "Restarting $TEST_DB_PROJECT, which runs without the storage service the tests need." >&2
    supabase stop --project-id "$TEST_DB_PROJECT" 6>&- 7>&- 8>&-
    start_stack
  fi
  supabase db reset --local --no-seed
  make_ready
  db_sql "create schema if not exists test_db; comment on schema test_db is '$want'"
  echo "Rebuilt $TEST_DB_PROJECT from supabase/migrations." >&2
else
  make_ready
  echo "$TEST_DB_PROJECT already matches supabase/migrations, no reset needed." >&2
fi
test_lock_wait 8 sh 30 "Waiting for another session to finish with $TEST_DB_PROJECT."
write_env
exec 7>&-

[ $# -gt 0 ] && exec "$@"
exit 0
