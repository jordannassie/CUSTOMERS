#!/usr/bin/env bash
# Rebuilds the local Supabase database from supabase/migrations before the test suite (MVP_SPEC 21).
# Writes the local URL and keys to .env.test.local, which vitest.config.mts reads.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/test-db-env.sh

# Services the tests do not use; skipping them keeps start-up fast and light. Storage stays on for the logo upload spec (B-55).
EXCLUDE="studio,imgproxy,vector,logflare,edge-runtime,realtime,postgres-meta,supavisor"

if ! supabase status >/dev/null 2>&1; then
  supabase start -x "$EXCLUDE"
fi

supabase db reset --local --no-seed

# Right after a start, status can print before the stack reports its URLs.
status=""
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

# The reset recreates the db and auth containers while PostgREST and Kong keep running and reconnect, so the
# gateway can answer 502 for a moment. Start the tests only once REST (with the schema) and auth answer 200
# several times in a row (BUG-017).
ready=0
for _ in $(seq 1 120); do
  rest=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/rest/v1/plans?select=id&limit=1" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" || true)
  auth=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/auth/v1/health" -H "apikey: $ANON_KEY" || true)
  if [ "$rest" = 200 ] && [ "$auth" = 200 ]; then ready=$((ready + 1)); else ready=0; fi
  [ "$ready" -ge 5 ] && break
  sleep 0.5
done
if [ "$ready" -lt 5 ]; then
  echo "Local Supabase did not become ready (REST $rest, auth $auth)" >&2
  exit 1
fi

cat > .env.test.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_DB_URL=$DB_URL
ENV
