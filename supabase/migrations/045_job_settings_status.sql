-- Migration 045: which scheduled-job settings are in place, for the admin status page (BUG-108).
-- Before this, the page said scheduled jobs were "not set up" even while they ran, and nothing showed that the
-- scan worker's Vault secrets were missing (queued scans then wait forever). Returns yes/no only, never a value.
-- Reads vault and cron with the owner's rights. Service role only.

create or replace function public.job_settings_status()
returns table (
  worker_url_set boolean,
  worker_secret_set boolean,
  alerts_url_set boolean,
  email_jobs_url_set boolean,
  scheduled_scans_include_real boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from vault.decrypted_secrets where name = 'scan_worker_url' and coalesce(decrypted_secret, '') <> ''),
    exists (select 1 from vault.decrypted_secrets where name = 'scan_worker_secret' and coalesce(decrypted_secret, '') <> ''),
    exists (select 1 from vault.decrypted_secrets where name = 'system_alerts_url' and coalesce(decrypted_secret, '') <> ''),
    exists (select 1 from vault.decrypted_secrets where name = 'email_jobs_url' and coalesce(decrypted_secret, '') <> ''),
    coalesce(
      (select j.command ilike '%enqueue_due_scans(true)%' from cron.job j where j.jobname = 'enqueue-due-scans'),
      false
    );
$$;

revoke all on function public.job_settings_status() from public, anon, authenticated;
grant execute on function public.job_settings_status() to service_role;
