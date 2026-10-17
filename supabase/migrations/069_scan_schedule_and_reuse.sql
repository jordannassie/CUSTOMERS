-- Migration 069: scheduled scans and the shared answer cache, skipped scans and reused answers. Additive only (D-43):
-- new functions and one replaced function (create or replace, body copied from 050 with one branch changed).
--
-- H1  The shared answer cache keeps an answer for 20 hours (src/modules/scanning/cache.ts) and a finished scan's next
--     scan lands on the 02:00 UTC run (enqueue-due-scans, 029) at least 20 hours later (src/modules/scanning/
--     schedule.ts). So a scheduled scan never gets, and pays for, an answer the same business already got. The
--     app computes that date; next_scheduled_scan_run is the same run hour for the SQL side.
-- M3  A scan skipped because the agency had no credits is tried again at the next 02:00 run, not a full cycle later
--     (a weekly business no longer waits a week). queue_skipped_scans queues those scans again at once for one
--     agency; the top-up webhook calls it.
-- UI  scan_jobs_reused_answers counts each scan's checks answered from the shared cache, for the scan history.

-- ---------------------------------------------------------------------------
-- next_scheduled_scan_run: the first 02:00 UTC run of enqueue-due-scans strictly after p_after.
-- ---------------------------------------------------------------------------
create or replace function public.next_scheduled_scan_run(p_after timestamptz)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select case when run > p_after then run else run + interval '1 day' end
  from (select (date_trunc('day', p_after at time zone 'UTC') + interval '2 hours') at time zone 'UTC' as run) r;
$$;

-- ---------------------------------------------------------------------------
-- scan_job_settle_failure: as in 050, except a scan skipped for lack of credits (the worker's "out of credits"
-- reason, or an agency at 0 credits or below) is due again at the next 02:00 run instead of a full cycle later.
-- It never moves a date that is already later than that run, so a skipped Run scan does not bring the next
-- scheduled scan closer than the cache allows.
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
  v_no_credits boolean;
begin
  select j.hold_id, j.business_id, j.agency_id, j.error, b.scan_frequency, b.next_scan_at
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
    v_no_credits := v_job.error = 'You''re out of credits. Buy a top-up or upgrade.'
      or coalesce((select cb.balance from public.agency_credit_balance cb where cb.agency_id = v_job.agency_id), 0) <= 0;
    if v_no_credits then
      v_next := public.next_scheduled_scan_run(now());
      v_next := greatest(v_next, coalesce(v_job.next_scan_at, v_next));
    else
      v_next := now() + make_interval(days => case v_job.scan_frequency when 'daily' then 1 when 'monthly' then 30 else 7 end);
    end if;
  elsif v_job.next_scan_at is null then
    v_next := now() + interval '1 day';
  else
    return;
  end if;
  perform public.set_next_scan_at(v_job.business_id, v_next);
end;
$$;

-- ---------------------------------------------------------------------------
-- queue_skipped_scans: after a top-up, queue now the agency's scheduled scans that did not run for lack of credits:
-- a business already due (enqueue-due-scans left it out at 0 credits) or one whose last scan was skipped and is due
-- by the next run. The same filters as enqueue_due_scans (050), including its go-live switch for real agencies, and
-- never a business with a finished scan in the last 20 hours, so no answer is charged twice from the cache.
-- Returns how many jobs were added.
-- ---------------------------------------------------------------------------
create or replace function public.queue_skipped_scans(p_agency_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_include_real boolean;
begin
  v_include_real := coalesce(
    (select j.command ilike '%enqueue_due_scans(true)%' from cron.job j where j.jobname = 'enqueue-due-scans'),
    false
  );

  insert into public.scan_jobs (business_id, agency_id)
  select b.id, b.agency_id
  from public.businesses b
  join public.agencies a on a.id = b.agency_id
  join public.agency_credit_balance cb on cb.agency_id = a.id
  where b.agency_id = p_agency_id
    and b.next_scan_at is not null
    and b.deleted_at is null
    and b.status not in ('paused', 'canceled')
    and public.scan_job_business_on_plan(b.id)
    and a.status not in ('past_due', 'canceled', 'suspended', 'deleted')
    and cb.balance > 0
    and (a.is_test or v_include_real)
    and (
      b.next_scan_at <= now()
      or (
        b.next_scan_at <= public.next_scheduled_scan_run(now())
        and (select j.status from public.scan_jobs j where j.business_id = b.id order by j.created_at desc limit 1) = 'skipped'
      )
    )
    and not exists (
      select 1 from public.scan_jobs d
      where d.business_id = b.id and d.status = 'done' and d.finished_at > now() - interval '20 hours'
    )
  on conflict (business_id) where status in ('queued', 'running') do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- scan_jobs_reused_answers: per scan job, how many of its checks were answered from the shared cache.
-- ---------------------------------------------------------------------------
create or replace function public.scan_jobs_reused_answers(p_job_ids uuid[])
returns table (scan_job_id uuid, reused integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.scan_job_id, count(*)::integer
  from public.visibility_runs r
  join public.visibility_results v on v.run_id = r.id
  where r.scan_job_id = any(p_job_ids) and v.cached
  group by r.scan_job_id;
$$;

revoke all on function
  public.next_scheduled_scan_run(timestamptz),
  public.scan_job_settle_failure(uuid, boolean),
  public.queue_skipped_scans(uuid),
  public.scan_jobs_reused_answers(uuid[])
from public, anon, authenticated;

grant execute on function
  public.next_scheduled_scan_run(timestamptz),
  public.scan_job_settle_failure(uuid, boolean),
  public.queue_skipped_scans(uuid),
  public.scan_jobs_reused_answers(uuid[])
to service_role;
