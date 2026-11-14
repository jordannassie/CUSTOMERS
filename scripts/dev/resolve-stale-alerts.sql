-- LOCAL ONLY: closes admin alerts that are stale, so the Overview shows only what is still wrong.
-- Run it with scripts/dev/resolve-stale-alerts.sh, which checks the database is the local Docker one.
--
-- Stale means the alert check has not seen the problem for 24 hours (last_seen_at): check_system_alerts() bumps
-- last_seen_at every 15 minutes while a problem lasts, so an alert still true right now is kept. Closing one of
-- those would only make the next check open it again.
\set ON_ERROR_STOP on

with resolved as (
  update public.system_alerts
  set resolved_at = now()
  where resolved_at is null
    and last_seen_at < now() - interval '24 hours'
  returning kind, created_at, last_seen_at
)
select kind, created_at::timestamptz(0) as opened, last_seen_at::timestamptz(0) as last_seen from resolved order by created_at;

select count(*) as still_open, coalesce(string_agg(kind, ', ' order by kind), '') as kinds
from public.system_alerts where resolved_at is null;
