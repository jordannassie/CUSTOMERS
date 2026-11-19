#!/usr/bin/env bash
# LOCAL ONLY: sets the Vault secrets for the scheduled jobs in the local Supabase Docker database, so weekly scans,
# admin alerts and scheduled emails start against `npm run dev` on port 3000. Refuses anything but a local database.
#   npm run vault:local
set -euo pipefail
cd "$(dirname "$0")/../.."

ENV_FILE=.env.local
[ -f "$ENV_FILE" ] || ENV_FILE=.env
url=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
case "$url" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing: $ENV_FILE points at $url, not a local Supabase." >&2; exit 1 ;;
esac
secret=$(grep -E '^WORKER_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
[ -n "$secret" ] || { echo "Refusing: WORKER_SECRET is empty in $ENV_FILE." >&2; exit 1; }

project=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
container="supabase_db_${project}"
docker inspect "$container" >/dev/null 2>&1 || { echo "Refusing: no local container $container (run supabase start)." >&2; exit 1; }

docker exec -i "$container" psql -U postgres -d postgres -v worker_secret="$secret" < scripts/dev/setup-local-vault.sql
echo "Done. Keep the dev server on port 3000 (npm run dev). WORKER_SECRET from $ENV_FILE."
