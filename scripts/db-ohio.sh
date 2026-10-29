#!/usr/bin/env bash
# npm run db:ohio: applies this branch's migrations that customers-dev-ohio (the test database behind the preview
# deploys) has not recorded yet. Never the live project.
#
# - Reads OHIO_DB_URL from .env.ohio.local (git-ignored). Needs Docker: psql and pg_dump come from the local Supabase
#   image, the same Postgres version as Ohio.
# - Backs Ohio up first, to ~/.customers-direct-backups/.
# - Each file runs in one transaction with its supabase_migrations record, so a failing file changes nothing and the
#   run stops there.
# - Migrations Ohio has from other branches (it may be ahead) are left alone.
# DRY_RUN=1 npm run db:ohio lists what would run and changes nothing.
set -euo pipefail
cd "$(dirname "$0")/.."

OHIO_REF=cnjpddwlvprwjfpssyqp
LIVE_REF=wsxusvapciexemfvtadm
IMAGE=public.ecr.aws/supabase/postgres:17.11.0.004

[ -f .env.ohio.local ] || { echo "Missing .env.ohio.local with OHIO_DB_URL=postgresql://... (Supabase, Connect, Session pooler)."; exit 1; }
set -a; source .env.ohio.local; set +a
case "${OHIO_DB_URL:-}" in *"$LIVE_REF"*) echo "Refusing: OHIO_DB_URL points at the live project."; exit 1 ;; esac
case "${OHIO_DB_URL:-}" in *"$OHIO_REF"*) ;; *) echo "Refusing: OHIO_DB_URL is not customers-dev-ohio ($OHIO_REF)."; exit 1 ;; esac

# The address goes in as an environment variable, so the password never shows in the process list.
ohio() { docker run --rm -i -e PGURL="$OHIO_DB_URL" --entrypoint sh "$IMAGE" -c "$1"; }
psql_ohio() { ohio 'psql "$PGURL" -X -q -v ON_ERROR_STOP=1 '"$1"; }

applied=$(psql_ohio "-tA -c 'select version from supabase_migrations.schema_migrations'")
pending=()
for file in supabase/migrations/[0-9]*.sql; do
  name=$(basename "$file" .sql)
  grep -qx "${name%%_*}" <<<"$applied" || pending+=("$file")
done

if [ ${#pending[@]} -eq 0 ]; then
  echo "ok   customers-dev-ohio already has every migration on this branch"
  exit 0
fi
echo "To apply on customers-dev-ohio:"
printf '  %s\n' "${pending[@]##*/}"
[ "${DRY_RUN:-}" = 1 ] && exit 0

backups="$HOME/.customers-direct-backups"
mkdir -p "$backups"
backup="$backups/ohio-$(date +%Y%m%d-%H%M%S).sql"
ohio 'pg_dump "$PGURL" --no-owner --no-privileges -n public -n storage -n supabase_migrations -n auth' > "$backup"
echo "ok   backup $backup"

for file in "${pending[@]}"; do
  name=$(basename "$file" .sql)
  version=${name%%_*}
  record="insert into supabase_migrations.schema_migrations (version, name) values ('$version', '${name#*_}');"
  if grep -qiE '^\s*(begin|commit)\s*;' "$file"; then
    # The file has its own transaction: run it as written, then record it.
    psql_ohio "-f -" < "$file"
    psql_ohio "-c \"$record\""
  else
    { echo "begin;"; cat "$file"; echo; echo "$record"; echo "commit;"; } | psql_ohio "-f -"
  fi
  echo "ok   $name"
done
echo "ok   customers-dev-ohio is up to date"
