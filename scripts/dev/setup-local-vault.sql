-- LOCAL ONLY: the Vault secrets the scheduled jobs need, pointing at `npm run dev` on this machine.
-- Run it with scripts/dev/setup-local-vault.sh, which checks the database is the local Docker one and passes the
-- worker secret from .env.local (or .env). Never run it on customers-dev or production: their values are in
-- supabase/migrations/README.md ("Vault secrets").
--
-- From inside the Supabase Docker containers the host is host.docker.internal (the CLI maps it to the host gateway).
--   scan_worker_url     the dev-only route that runs the same worker as the Netlify function
--   scan_worker_secret  must equal WORKER_SECRET in the env file the dev server reads
--   system_alerts_url   admin alerts (every 15 minutes)
--   email_jobs_url      scheduled emails
\set ON_ERROR_STOP on

create or replace function pg_temp.set_secret(p_name text, p_value text) returns void language plpgsql as $$
begin
  if exists (select 1 from vault.secrets where name = p_name) then
    perform vault.update_secret((select id from vault.secrets where name = p_name), p_value);
  else
    perform vault.create_secret(p_value, p_name);
  end if;
end;
$$;

select pg_temp.set_secret('scan_worker_url', 'http://host.docker.internal:3000/api/dev/scan-worker');
select pg_temp.set_secret('scan_worker_secret', :'worker_secret');
select pg_temp.set_secret('system_alerts_url', 'http://host.docker.internal:3000/api/alerts/check');
select pg_temp.set_secret('email_jobs_url', 'http://host.docker.internal:3000/api/email/jobs');

-- Yes or no only, never a value.
select name, coalesce(decrypted_secret, '') <> '' as is_set from vault.decrypted_secrets
where name in ('scan_worker_url', 'scan_worker_secret', 'system_alerts_url', 'email_jobs_url') order by name;
