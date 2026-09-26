#!/usr/bin/env bash
# Fails when the local database (built from supabase/migrations) differs from the linked project (B-10).
# Usage: supabase link --project-ref <ref>, supabase db reset --local, then npm run db:drift
set -euo pipefail
cd "$(dirname "$0")/.."

facts() {
  supabase db query "$1" -f scripts/db-drift.sql --output-format json 2>/dev/null | jq -r '.rows[].k'
}

local_facts=$(mktemp)
remote_facts=$(mktemp)
trap 'rm -f "$local_facts" "$remote_facts"' EXIT

# The local image enables pg_net by default; the live project does not use it.
facts --local | grep -v '^ext pg_net ' > "$local_facts"
facts --linked > "$remote_facts"

if diff "$local_facts" "$remote_facts"; then
  echo "ok   no drift: $(wc -l < "$local_facts" | tr -d ' ') schema facts match the linked project"
else
  echo "FAIL drift: '<' only local, '>' only on the linked project"
  exit 1
fi
