-- Migration 029: scan schedules with pg_cron and pg_net (B-28, MVP_SPEC 6.2, D-42).
-- Additive only (D-43). The worker URL and secret live in Vault, set by hand per project
-- (supabase/migrations/README.md); never in a migration. Without them the worker call does nothing.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- enqueue_due_scans: one queued job per business due today whose agency has credits and is in good
-- standing. "Due today" rather than due now: a daily scan finished at 02:05 is due at 02:05 tomorrow,
-- which a strict next_scan_at <= now() at 02:00 would push to the day after.
-- Until go-live (B-80) the schedule passes p_include_real = false, so only is_test agencies are scanned.
-- A business that already has a queued or running job is skipped (D-55). Returns how many jobs were added.
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_due_scans(p_include_real boolean default false)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.scan_jobs (business_id, agency_id)
  select b.id, b.agency_id
  from public.businesses b
  join public.agencies a on a.id = b.agency_id
  join public.agency_credit_balance cb on cb.agency_id = a.id
  where b.next_scan_at < date_trunc('day', now()) + interval '1 day'
    and b.status <> 'paused'
    and a.status not in ('past_due', 'canceled', 'suspended', 'deleted')
    and cb.balance > 0
    and (a.is_test or p_include_real)
  on conflict (business_id) where status in ('queued', 'running') do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- call_scan_worker: pg_net POST to the worker with its secret header, only when a job is waiting, so an
-- idle queue never wakes the host. Returns the pg_net request ID, or null when nothing was sent.
-- ---------------------------------------------------------------------------
create or replace function public.call_scan_worker()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.scan_jobs where status = 'queued' and run_after <= now()) then
    return null;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'scan_worker_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'scan_worker_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return null;
  end if;

  return net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', v_secret),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function
  public.enqueue_due_scans(boolean),
  public.call_scan_worker()
from public, anon, authenticated;

grant execute on function
  public.enqueue_due_scans(boolean),
  public.call_scan_worker()
to service_role;

-- ---------------------------------------------------------------------------
-- The four schedules (UTC), plus a daily purge of pg_cron's run history, which grows by about 1,600 rows a day.
-- cron.schedule with a name replaces a job of the same name, so rerunning is safe.
-- Grants expire at 01:00, before the 02:00 enqueue reads balances.
-- ---------------------------------------------------------------------------
select cron.schedule('enqueue-due-scans', '0 2 * * *', 'select public.enqueue_due_scans(false)');
select cron.schedule('call-scan-worker', '* * * * *', 'select public.call_scan_worker()');
select cron.schedule('reset-stuck-jobs', '*/10 * * * *', 'select public.reset_stuck_jobs()');
select cron.schedule('expire-grants', '0 1 * * *', 'select public.expire_grants()');
select cron.schedule('purge-cron-history', '30 3 * * *', $$delete from cron.job_run_details where end_time < now() - interval '14 days'$$);
