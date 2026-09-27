-- Migration 033: admin Retry of a failed scan job in one transaction (B-67, done in B-28).
-- Additive only (D-43). Service role only, like requeue_scan_job in 028.

-- ---------------------------------------------------------------------------
-- retry_scan_job: a failed job goes back to queued with fresh attempts. Like requeue_scan_job, a closed hold
-- with nothing charged is detached, otherwise hold_credits would hand it back and the scan would skip as
-- already finished. An open hold stays, so the retry resumes it without charging twice.
-- Returns 'queued', 'not_failed', or 'business_busy' when the business already has an active job (D-55);
-- in that case the detach is rolled back too.
-- ---------------------------------------------------------------------------
create or replace function public.retry_scan_job(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold_id uuid;
begin
  select hold_id into v_hold_id
  from public.scan_jobs
  where id = p_job_id and status = 'failed'
  for update;
  if not found then
    return 'not_failed';
  end if;

  begin
    if v_hold_id is not null and exists (
      select 1 from public.credit_holds where id = v_hold_id and status = 'closed' and captured = 0
    ) then
      update public.scan_jobs set hold_id = null where id = p_job_id;
      update public.credit_holds set scan_job_id = null where id = v_hold_id;
    end if;

    update public.scan_jobs
    set status = 'queued', attempts = 0, run_after = now(), locked_at = null, finished_at = null, error = null
    where id = p_job_id;
  exception when unique_violation then
    return 'business_busy';
  end;
  return 'queued';
end;
$$;

revoke all on function public.retry_scan_job(uuid) from public, anon, authenticated;
grant execute on function public.retry_scan_job(uuid) to service_role;
