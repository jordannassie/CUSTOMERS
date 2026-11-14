#!/usr/bin/env bash
# LOCAL ONLY: resolves admin alerts not seen for 24 hours in the local Supabase Docker database.
# Refuses anything but a local database.
#   npm run alerts:resolve-stale
set -euo pipefail
cd "$(dirname "$0")/../.."

ENV_FILE=.env.local
[ -f "$ENV_FILE" ] || ENV_FILE=.env
url=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
case "$url" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing: $ENV_FILE points at $url, not a local Supabase." >&2; exit 1 ;;
esac

project=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
container="supabase_db_${project}"
docker inspect "$container" >/dev/null 2>&1 || { echo "Refusing: no local container $container (run supabase start)." >&2; exit 1; }

docker exec -i "$container" psql -U postgres -d postgres < scripts/dev/resolve-stale-alerts.sql
