-- Migration 050: scan job and credit safety (fix list Step 2: A5, A6, B3, B4, B5). Additive only (D-43): new
-- functions, replaced functions (create or replace) and one wider check constraint; no table is reshaped.
--
-- A5  A job that ends failed releases its open credit hold (capture what was used, release the rest). Before,
--     only a finished scan did, so a job failing on attempt 3, or reset as stuck 3 times, kept its hold open and
--     lowered the agency's balance for good. release_orphan_holds sweeps up any that still slip through.
-- A6  A deleted business, or one taken off the plan, is never scheduled again: enqueue_due_scans skips it, and
--     set_next_scan_at (used when a scan finishes) refuses it. retry_scan_job refuses a deleted business.
-- B3  A retry that now needs more checks than its first attempt (questions or models were added) grows its open
--     hold, so it can finish instead of failing on hold_used_up.
-- B4  Stuck means no sign of life for 20 minutes, and a running scan now refreshes locked_at as its checks finish,
--     so a long scan is no longer reset and run twice.
-- B5  A skipped scan (no questions, no city, out of credits...) is its own status, 'skipped', which alerts ignore.
--     It moves the business's next scan on by its frequency, so it is not queued again every night, and the first
--     scan of a business that failed sets next_scan_at, so it is scheduled at all.

alter table public.scan_jobs drop constraint if exists scan_jobs_status_check;
alter table public.scan_jobs
  add constraint scan_jobs_status_check check (status in ('queued', 'running', 'done', 'failed', 'skipped'));

-- ---------------------------------------------------------------------------
-- scan_job_on_plan: false once the business was taken off the plan (its plan item is canceled). A business with no
-- plan item at all (a test agency, or the first business before its webhook) is not "off the plan".
-- ---------------------------------------------------------------------------
create or replace function public.scan_job_business_on_plan(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.business_subscriptions s where s.business_id = p_business_id and s.status = 'canceled'
  );
$$;

-- ---------------------------------------------------------------------------
-- set_next_scan_at: what a finished scan calls. A deleted business, or one taken off the plan while the scan ran,
-- stays unscheduled. Returns whether the date was set.
-- ---------------------------------------------------------------------------
create or replace function public.set_next_scan_at(p_business_id uuid, p_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses
  set next_scan_at = p_at
  where id = p_business_id
    and deleted_at is null
    and public.scan_job_business_on_plan(id);
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- scan_job_settle_failure: what every failed or skipped job runs, with the agency and the job already locked.
-- Releases the open hold, then keeps the schedule moving: a skipped scan moves the next scan on by the business's
-- frequency, and a failed scan of a business that was never scheduled (its first scan) is tried again tomorrow.
-- A failed scan of a scheduled business keeps its due date, so tonight's run tries again (as before).
-- ---------------------------------------------------------------------------
create or replace function public.scan_job_settle_failure(p_job_id uuid, p_skipped boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job record;
  v_next timestamptz;
begin
  select j.hold_id, j.business_id, b.scan_frequency, b.next_scan_at
  into v_job
  from public.scan_jobs j
  join public.businesses b on b.id = j.business_id
  where j.id = p_job_id;
  if not found then
    return;
  end if;

  if v_job.hold_id is not null then
    perform public.release_hold(v_job.hold_id);
  end if;

  if p_skipped then
    v_next := now() + make_interval(days => case v_job.scan_frequency when 'daily' then 1 when 'monthly' then 30 else 7 end);
  elsif v_job.next_scan_at is null then
    v_next := now() + interval '1 day';
  else
    return;
  end if;
  perform public.set_next_scan_at(v_job.business_id, v_next);
end;
$$;

-- ---------------------------------------------------------------------------
-- fail_scan_job: the worker's way to end a job as failed or skipped. Only the worker holding claim p_attempts may.
-- Agency lock first, then the job row, the same order as every credit function (D-55).
-- ---------------------------------------------------------------------------
create or replace function public.fail_scan_job(p_job_id uuid, p_attempts integer, p_error text, p_skipped boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency_id uuid;
begin
  select agency_id into v_agency_id from public.scan_jobs where id = p_job_id;
  if not found then
    return false;
  end if;
  perform public.credit_lock_agency(v_agency_id);

  update public.scan_jobs
  set status = case when p_skipped then 'skipped' else 'failed' end,
      error = p_error,
      locked_at = null,
      finished_at = now()
  where id = p_job_id and attempts = p_attempts and status = 'running';
  if not found then
    return false;
  end if;

  perform public.scan_job_settle_failure(p_job_id, p_skipped);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- reset_stuck_jobs: jobs running with no sign of life for 20 minutes (the worker died) go back to queued, or fail
-- after 3 attempts and release their hold. A live scan refreshes locked_at after each batch of checks (B4).
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
  v_candidate record;
  v_job record;
  v_count integer := 0;
  v_detached integer;
begin
  for v_candidate in
    select id, agency_id from public.scan_jobs
    where status = 'running' and locked_at < now() - interval '20 minutes'
    order by created_at
  loop
    perform public.credit_lock_agency(v_candidate.agency_id);
    -- Read again under the lock: the worker may have finished or refreshed the job in the meantime.
    select id, attempts, hold_id into v_job
    from public.scan_jobs
    where id = v_candidate.id and status = 'running' and locked_at < now() - interval '20 minutes'
    for update skip locked;
    continue when not found;

    if v_job.attempts >= 3 then
      update public.scan_jobs
      set status = 'failed', locked_at = null, finished_at = now(), error = 'The scan stopped without finishing 3 times.'
      where id = v_job.id;
      perform public.scan_job_settle_failure(v_job.id, false);
    else
      update public.credit_holds set scan_job_id = null
      where id = v_job.hold_id and status = 'closed' and captured = 0;
      get diagnostics v_detached = row_count;
      update public.scan_jobs
      set status = 'queued',
          hold_id = case when v_detached > 0 then null else hold_id end,
          locked_at = null,
          finished_at = null,
          error = 'The scan stopped without finishing; trying again.'
      where id = v_job.id;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_orphan_holds: safety sweep. An open hold whose job is failed, skipped or done, or whose job is gone for
-- over an hour, is released; what was captured stays charged. Returns how many holds were released.
-- ---------------------------------------------------------------------------
create or replace function public.release_orphan_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold record;
  v_count integer := 0;
begin
  for v_hold in
    select h.id from public.credit_holds h
    left join public.scan_jobs j on j.id = h.scan_job_id
    where h.status = 'open'
      and (
        j.status in ('failed', 'skipped', 'done')
        or (h.scan_job_id is null and h.created_at < now() - interval '1 hour')
      )
  loop
    perform public.release_hold(v_hold.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- hold_credits: as in 023, except that a retried job's open hold grows when the scan now needs more checks.
-- ---------------------------------------------------------------------------
create or replace function public.hold_credits(p_agency_id uuid, p_amount integer, p_scan_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_overdraft integer;
  v_hold_id uuid;
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_overdraft := public.credit_lock_agency(p_agency_id);

  if not exists (select 1 from public.scan_jobs where id = p_scan_job_id and agency_id = p_agency_id) then
    raise exception 'scan_job_not_found' using errcode = 'P0002';
  end if;

  -- A retried job gets its existing hold back instead of a second one. It started, so it finishes (D-54): when
  -- questions or models were added since, the hold grows to cover every check instead of failing on hold_used_up.
  select id into v_hold_id from public.credit_holds where scan_job_id = p_scan_job_id;
  if found then
    update public.credit_holds set amount = p_amount where id = v_hold_id and status = 'open' and amount < p_amount;
    return v_hold_id;
  end if;

  select
    coalesce((select sum(remaining) from public.credit_grants
              where agency_id = p_agency_id and remaining > 0 and (expires_at is null or expires_at > now())), 0)
    - coalesce((select sum(amount - captured - released) from public.credit_holds
                where agency_id = p_agency_id and status = 'open'), 0)
    - v_overdraft
  into v_balance;

  if v_balance <= 0 then
    raise exception 'insufficient_credits' using errcode = 'P0001', detail = format('balance %s', v_balance);
  end if;

  insert into public.credit_holds (agency_id, scan_job_id, amount)
  values (p_agency_id, p_scan_job_id, p_amount)
  returning id into v_hold_id;

  update public.scan_jobs set hold_id = v_hold_id where id = p_scan_job_id;

  return v_hold_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- enqueue_due_scans: as in 029, plus no deleted business and no business taken off the plan or canceled.
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
    and b.deleted_at is null
    and b.status not in ('paused', 'canceled')
    and public.scan_job_business_on_plan(b.id)
    and a.status not in ('past_due', 'canceled', 'suspended', 'deleted')
    and cb.balance > 0
    and (a.is_test or p_include_real)
  on conflict (business_id) where status in ('queued', 'running') do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- retry_scan_job: as in 033, plus skipped jobs can be retried, a deleted business is refused, and a closed hold is
-- detached whatever it charged: a failed job's hold is now closed by the failure (A5), and the checks it already
-- saved are skipped on the retry (capture is idempotent per check), so the retry holds only for the rest.
-- Returns 'queued', 'not_failed', 'business_deleted', or 'business_busy' (the detach is rolled back too).
-- ---------------------------------------------------------------------------
create or replace function public.retry_scan_job(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold_id uuid;
  v_business_id uuid;
begin
  select hold_id, business_id into v_hold_id, v_business_id
  from public.scan_jobs
  where id = p_job_id and status in ('failed', 'skipped')
  for update;
  if not found then
    return 'not_failed';
  end if;

  if exists (select 1 from public.businesses where id = v_business_id and deleted_at is not null) then
    return 'business_deleted';
  end if;

  begin
    if v_hold_id is not null and exists (
      select 1 from public.credit_holds where id = v_hold_id and status = 'closed'
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

revoke all on function
  public.scan_job_business_on_plan(uuid),
  public.set_next_scan_at(uuid, timestamptz),
  public.scan_job_settle_failure(uuid, boolean),
  public.fail_scan_job(uuid, integer, text, boolean),
  public.release_orphan_holds()
from public, anon, authenticated;

grant execute on function
  public.scan_job_business_on_plan(uuid),
  public.set_next_scan_at(uuid, timestamptz),
  public.scan_job_settle_failure(uuid, boolean),
  public.fail_scan_job(uuid, integer, text, boolean),
  public.release_orphan_holds()
to service_role;

-- The sweep runs every 10 minutes beside reset-stuck-jobs. cron.schedule with a name replaces a job of that name.
select cron.schedule('release-orphan-holds', '5,15,25,35,45,55 * * * *', 'select public.release_orphan_holds()');
