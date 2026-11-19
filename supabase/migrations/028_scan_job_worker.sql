-- Migration 028: job worker functions (B-27, MVP_SPEC 6.3, D-42).
-- Additive only (D-43). Callable by the service role only, like the credit functions in 023.

-- ---------------------------------------------------------------------------
-- claim_scan_jobs: take up to p_limit due jobs in one statement. skip locked means two workers
-- running at once never take the same job. attempts goes up on every claim, so the worker can use it
-- to tell its own claim apart from a later one of the same job.
-- ---------------------------------------------------------------------------
create or replace function public.claim_scan_jobs(p_limit integer)
returns setof public.scan_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 then
    raise exception 'claim limit must be at least 1' using errcode = '22023';
  end if;

  return query
  update public.scan_jobs
  set status = 'running', locked_at = now(), attempts = attempts + 1
  where id in (
    select id from public.scan_jobs
    where status = 'queued' and run_after <= now()
    order by priority desc, created_at
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- reset_stuck_jobs: jobs running for over 10 minutes (the worker died) go back to queued. A job that has
-- already used its 3 attempts is failed instead, so a scan that always kills the worker cannot loop forever.
-- Like requeue_scan_job, a closed hold with nothing charged is detached so the retry gets a fresh one.
-- Returns how many jobs were reset or failed.
-- ---------------------------------------------------------------------------
create or replace function public.reset_stuck_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with stuck as (
    select id, attempts, hold_id from public.scan_jobs
    where status = 'running' and locked_at < now() - interval '10 minutes'
    for update skip locked
  ),
  detached as (
    update public.credit_holds h set scan_job_id = null
    from stuck s
    where h.id = s.hold_id and s.attempts < 3 and h.status = 'closed' and h.captured = 0
    returning h.id
  )
  update public.scan_jobs j
  set
    status = case when s.attempts >= 3 then 'failed' else 'queued' end,
    hold_id = case when j.hold_id in (select id from detached) then null else j.hold_id end,
    locked_at = null,
    finished_at = case when s.attempts >= 3 then now() else null end,
    error = case
      when s.attempts >= 3 then 'The scan stopped without finishing 3 times.'
      else 'The scan stopped without finishing; trying again.'
    end
  from stuck s
  where j.id = s.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- requeue_scan_job: put a failed attempt back in the queue with backoff. Only the worker holding claim
-- p_attempts may do it. hold_credits hands a retried job its first hold back, so a hold that closed with
-- nothing charged (every check failed) is detached here; otherwise the retry would find it closed and skip.
-- A closed hold with charges means the scan finished, so it stays and the retry ends the job as done.
-- ---------------------------------------------------------------------------
create or replace function public.requeue_scan_job(
  p_job_id uuid,
  p_attempts integer,
  p_run_after timestamptz,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold_id uuid;
begin
  select hold_id into v_hold_id
  from public.scan_jobs
  where id = p_job_id and attempts = p_attempts and status = 'running'
  for update;
  if not found then
    return false;
  end if;

  if v_hold_id is not null and exists (
    select 1 from public.credit_holds where id = v_hold_id and status = 'closed' and captured = 0
  ) then
    update public.scan_jobs set hold_id = null where id = p_job_id;
    update public.credit_holds set scan_job_id = null where id = v_hold_id;
  end if;

  update public.scan_jobs
  set status = 'queued', run_after = p_run_after, locked_at = null, error = p_error
  where id = p_job_id;
  return true;
end;
$$;

revoke all on function
  public.claim_scan_jobs(integer),
  public.requeue_scan_job(uuid, integer, timestamptz, text),
  public.reset_stuck_jobs()
from public, anon, authenticated;

grant execute on function
  public.claim_scan_jobs(integer),
  public.requeue_scan_job(uuid, integer, timestamptz, text),
  public.reset_stuck_jobs()
to service_role;
