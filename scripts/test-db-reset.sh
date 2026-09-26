#!/usr/bin/env bash
# Rebuilds the local Supabase database from supabase/migrations before the test suite (MVP_SPEC 21).
# Writes the local URL and keys to .env.test.local, which vitest.config.mts reads.
set -euo pipefail
cd "$(dirname "$0")/.."

# Services the tests do not use; skipping them keeps start-up fast and light.
EXCLUDE="studio,imgproxy,vector,logflare,edge-runtime,realtime,storage-api,postgres-meta,supavisor"

if ! supabase status >/dev/null 2>&1; then
  supabase start -x "$EXCLUDE"
fi

supabase db reset --local --no-seed

eval "$(supabase status -o env)"

# The CLI migration runner is off until B-10 fixes the duplicate 013_* version, so apply in filename order here.
for file in supabase/migrations/*.sql; do
  psql "$DB_URL" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -c "set client_min_messages = warning" -f "$file" >/dev/null
done
# PostgREST caches the schema; tell it about the new tables.
psql "$DB_URL" --quiet --no-psqlrc -c "notify pgrst, 'reload schema'"
echo "Applied $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') migrations to $DB_URL"

cat > .env.test.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_DB_URL=$DB_URL
ENV
